import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm'
import { InventoryItem, ItemStatus } from '../../database/entities/inventory-item.entity'
import { InventoryLocation } from '../../database/entities/inventory-location.entity'
import {
  InventoryLedger,
  LedgerTransactionType,
  LedgerReferenceType,
} from '../../database/entities/inventory-ledger.entity'
import { StockTransfer, StockTransferStatus } from '../../database/entities/stock-transfer.entity'
import {
  StockAdjustment,
  StockAdjustmentStatus,
  AdjustmentType,
} from '../../database/entities/stock-adjustment.entity'
import {
  StockReservation,
  ReservationStatus,
  ReservationForType,
} from '../../database/entities/stock-reservation.entity'
import { BarcodeQrRecord } from '../../database/entities/barcode-qr-record.entity'
import { PaginationDto, paginate } from '../../common/dto/pagination.dto'

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name)

  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemRepo: Repository<InventoryItem>,

    @InjectRepository(InventoryLocation)
    private readonly locationRepo: Repository<InventoryLocation>,

    @InjectRepository(InventoryLedger)
    private readonly ledgerRepo: Repository<InventoryLedger>,

    @InjectRepository(StockTransfer)
    private readonly transferRepo: Repository<StockTransfer>,

    @InjectRepository(StockAdjustment)
    private readonly adjustmentRepo: Repository<StockAdjustment>,

    @InjectRepository(StockReservation)
    private readonly reservationRepo: Repository<StockReservation>,

    @InjectRepository(BarcodeQrRecord)
    private readonly barcodeRepo: Repository<BarcodeQrRecord>,
  ) {}

  // ─── Items ───────────────────────────────────────────────────────────────

  async getItems(tenantId: string, dto: PaginationDto) {
    const qb = this.itemRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.currentLocation', 'location')
      .where('i.tenantId = :tenantId', { tenantId })
      .andWhere('i.isDeleted = false')

    if (dto.search) {
      qb.andWhere(
        '(i.productName ILIKE :search OR i.itemCode ILIKE :search OR i.barcode ILIKE :search OR i.productCode ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    const sortField = dto.sortBy || 'createdAt'
    const sortDir = (dto.sortDir?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
    qb.orderBy(`i.${sortField}`, sortDir)
    qb.skip(dto.skip).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getItem(tenantId: string, id: string): Promise<InventoryItem> {
    const item = await this.itemRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['currentLocation'],
    })
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`)
    return item
  }

  async createItem(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<InventoryItem> {
    const itemCode = dto.itemCode || (await this.generateItemCode(tenantId))

    const item = this.itemRepo.create({
      ...dto,
      tenantId,
      itemCode,
      createdBy: userId,
      availableQuantity: dto.currentQuantity ?? 0,
    })
    const saved = await this.itemRepo.save(item)

    // Write initial ledger entry if quantity > 0
    if (saved.currentQuantity > 0) {
      await this.writeLedger({
        tenantId,
        itemId: saved.id,
        transactionType: LedgerTransactionType.PURCHASE,
        quantity: saved.currentQuantity,
        balanceBefore: 0,
        balanceAfter: saved.currentQuantity,
        notes: 'Initial stock entry',
        createdBy: userId,
      })
    }

    return saved
  }

  async updateItem(
    tenantId: string,
    id: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<InventoryItem> {
    const item = await this.getItem(tenantId, id)
    Object.assign(item, dto)
    // Recalculate available quantity
    item.availableQuantity = Number(item.currentQuantity) - Number(item.reservedQuantity)
    return this.itemRepo.save(item)
  }

  // ─── Reservations ────────────────────────────────────────────────────────

  async reserveStock(
    tenantId: string,
    itemId: string,
    qty: number,
    forType: ReservationForType,
    forId: string,
    userId: string,
  ): Promise<StockReservation> {
    const item = await this.getItem(tenantId, itemId)

    if (Number(item.availableQuantity) < qty) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.availableQuantity}, Requested: ${qty}`,
      )
    }

    const reservation = this.reservationRepo.create({
      tenantId,
      itemId,
      quantityReserved: qty,
      reservedForType: forType,
      reservedForId: forId,
      status: ReservationStatus.ACTIVE,
      reservedBy: userId,
    })
    const saved = await this.reservationRepo.save(reservation)

    // Update item quantities
    item.reservedQuantity = Number(item.reservedQuantity) + qty
    item.availableQuantity = Number(item.availableQuantity) - qty
    if (item.availableQuantity <= 0) item.itemStatus = ItemStatus.RESERVED
    await this.itemRepo.save(item)

    // Write ledger
    await this.writeLedger({
      tenantId,
      itemId,
      transactionType: LedgerTransactionType.RESERVATION,
      quantity: qty,
      balanceBefore: Number(item.availableQuantity) + qty,
      balanceAfter: Number(item.availableQuantity),
      referenceType: LedgerReferenceType.ORDER,
      referenceId: forId,
      notes: `Reserved for ${forType} ${forId}`,
      createdBy: userId,
    })

    return saved
  }

  async releaseReservation(
    tenantId: string,
    reservationId: string,
  ): Promise<StockReservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId, tenantId },
    })
    if (!reservation) throw new NotFoundException(`Reservation ${reservationId} not found`)
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException('Reservation is not active')
    }

    reservation.status = ReservationStatus.RELEASED
    reservation.releasedAt = new Date()
    await this.reservationRepo.save(reservation)

    // Restore item quantities
    const item = await this.getItem(tenantId, reservation.itemId)
    item.reservedQuantity = Math.max(0, Number(item.reservedQuantity) - Number(reservation.quantityReserved))
    item.availableQuantity = Number(item.currentQuantity) - Number(item.reservedQuantity)
    if (item.availableQuantity > 0) item.itemStatus = ItemStatus.AVAILABLE
    await this.itemRepo.save(item)

    // Write ledger
    await this.writeLedger({
      tenantId,
      itemId: reservation.itemId,
      transactionType: LedgerTransactionType.RESERVATION_RELEASE,
      quantity: Number(reservation.quantityReserved),
      balanceBefore: Number(item.availableQuantity) - Number(reservation.quantityReserved),
      balanceAfter: Number(item.availableQuantity),
      notes: `Released reservation ${reservationId}`,
    })

    return reservation
  }

  // ─── Locations ───────────────────────────────────────────────────────────

  async getLocations(tenantId: string): Promise<InventoryLocation[]> {
    return this.locationRepo.find({
      where: { tenantId },
      relations: ['childLocations'],
      order: { locationName: 'ASC' },
    })
  }

  async createLocation(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<InventoryLocation> {
    const location = this.locationRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
    })
    return this.locationRepo.save(location)
  }

  // ─── Transfers ───────────────────────────────────────────────────────────

  async initiateTransfer(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<StockTransfer> {
    const transferNumber = await this.generateTransferNumber(tenantId)
    const transfer = this.transferRepo.create({
      ...dto,
      tenantId,
      transferNumber,
      status: StockTransferStatus.IN_TRANSIT,
      initiatedBy: userId,
    })
    return this.transferRepo.save(transfer)
  }

  async completeTransfer(
    tenantId: string,
    transferId: string,
    userId: string,
  ): Promise<StockTransfer> {
    const transfer = await this.transferRepo.findOne({
      where: { id: transferId, tenantId },
    })
    if (!transfer) throw new NotFoundException(`Transfer ${transferId} not found`)
    if (transfer.status !== StockTransferStatus.IN_TRANSIT) {
      throw new BadRequestException('Transfer is not in transit')
    }

    // Move items between locations and write ledger entries
    for (const transferItem of transfer.items as Array<{ itemId: string; quantity: number }>) {
      const item = await this.itemRepo.findOne({
        where: { id: transferItem.itemId, tenantId },
      })
      if (!item) continue

      const balanceBefore = Number(item.currentQuantity)

      // Update item location
      item.currentLocationId = transfer.toLocationId
      await this.itemRepo.save(item)

      // Write transfer_out ledger entry
      await this.writeLedger({
        tenantId,
        itemId: item.id,
        transactionType: LedgerTransactionType.TRANSFER_OUT,
        quantity: transferItem.quantity,
        balanceBefore,
        balanceAfter: balanceBefore,
        referenceType: LedgerReferenceType.TRANSFER,
        referenceId: transfer.id,
        fromLocationId: transfer.fromLocationId,
        toLocationId: transfer.toLocationId,
        notes: `Transfer out: ${transfer.transferNumber}`,
        createdBy: userId,
      })

      // Write transfer_in ledger entry
      await this.writeLedger({
        tenantId,
        itemId: item.id,
        transactionType: LedgerTransactionType.TRANSFER_IN,
        quantity: transferItem.quantity,
        balanceBefore,
        balanceAfter: balanceBefore,
        referenceType: LedgerReferenceType.TRANSFER,
        referenceId: transfer.id,
        fromLocationId: transfer.fromLocationId,
        toLocationId: transfer.toLocationId,
        notes: `Transfer in: ${transfer.transferNumber}`,
        createdBy: userId,
      })
    }

    transfer.status = StockTransferStatus.COMPLETED
    transfer.completedAt = new Date()
    transfer.approvedBy = userId
    return this.transferRepo.save(transfer)
  }

  // ─── Adjustments ─────────────────────────────────────────────────────────

  async createAdjustment(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<StockAdjustment> {
    const item = await this.getItem(tenantId, dto.itemId)
    const adjustmentNumber = await this.generateAdjustmentNumber(tenantId)

    const adjustment = this.adjustmentRepo.create({
      ...dto,
      tenantId,
      adjustmentNumber,
      quantityBefore: item.currentQuantity,
      status: StockAdjustmentStatus.DRAFT,
      createdBy: userId,
    })
    return this.adjustmentRepo.save(adjustment)
  }

  async approveAdjustment(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<StockAdjustment> {
    const adjustment = await this.adjustmentRepo.findOne({
      where: { id, tenantId },
      relations: ['item'],
    })
    if (!adjustment) throw new NotFoundException(`Adjustment ${id} not found`)
    if (adjustment.status !== StockAdjustmentStatus.DRAFT) {
      throw new BadRequestException('Adjustment is not in draft status')
    }

    const item = await this.getItem(tenantId, adjustment.itemId)
    const balanceBefore = Number(item.currentQuantity)
    let balanceAfter = balanceBefore

    if (adjustment.adjustmentType === AdjustmentType.INCREASE || adjustment.adjustmentType === AdjustmentType.CORRECTION) {
      item.currentQuantity = Number(item.currentQuantity) + Number(adjustment.quantityAdjusted)
      item.availableQuantity = Number(item.currentQuantity) - Number(item.reservedQuantity)
      balanceAfter = Number(item.currentQuantity)
    } else if (adjustment.adjustmentType === AdjustmentType.DECREASE) {
      item.currentQuantity = Math.max(0, Number(item.currentQuantity) - Number(adjustment.quantityAdjusted))
      item.availableQuantity = Number(item.currentQuantity) - Number(item.reservedQuantity)
      balanceAfter = Number(item.currentQuantity)
    }

    await this.itemRepo.save(item)

    // Write ledger
    const txType =
      adjustment.adjustmentType === AdjustmentType.DECREASE
        ? LedgerTransactionType.ADJUSTMENT_OUT
        : LedgerTransactionType.ADJUSTMENT_IN

    await this.writeLedger({
      tenantId,
      itemId: item.id,
      transactionType: txType,
      quantity: Number(adjustment.quantityAdjusted),
      balanceBefore,
      balanceAfter,
      referenceType: LedgerReferenceType.ADJUSTMENT,
      referenceId: adjustment.id,
      notes: adjustment.adjustmentReason,
      createdBy: userId,
    })

    adjustment.status = StockAdjustmentStatus.APPROVED
    adjustment.approvedBy = userId
    adjustment.approvedAt = new Date()
    adjustment.quantityAfter = balanceAfter
    return this.adjustmentRepo.save(adjustment)
  }

  // ─── Ledger ───────────────────────────────────────────────────────────────

  async getLedger(
    tenantId: string,
    itemId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<InventoryLedger[]> {
    const qb = this.ledgerRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.item', 'item')
      .where('l.tenantId = :tenantId', { tenantId })

    if (itemId) qb.andWhere('l.itemId = :itemId', { itemId })
    if (dateFrom) qb.andWhere('l.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) })
    if (dateTo) qb.andWhere('l.createdAt <= :dateTo', { dateTo: new Date(dateTo) })

    return qb.orderBy('l.createdAt', 'DESC').getMany()
  }

  // ─── Barcodes ─────────────────────────────────────────────────────────────

  async lookupBarcode(tenantId: string, code: string): Promise<InventoryItem> {
    // First try barcode/qr_code on the item itself
    const item = await this.itemRepo.findOne({
      where: [
        { tenantId, barcode: code, isDeleted: false },
        { tenantId, qrCode: code, isDeleted: false },
      ],
      relations: ['currentLocation'],
    })
    if (item) return item

    // Fall back to barcode records table
    const record = await this.barcodeRepo.findOne({
      where: { tenantId, codeValue: code },
      relations: ['item'],
    })
    if (!record || !record.item) {
      throw new NotFoundException(`No item found for code: ${code}`)
    }
    return record.item
  }

  // ─── Variances ───────────────────────────────────────────────────────────

  async getVariances(tenantId: string, dto: PaginationDto) {
    const adjustments = await this.adjustmentRepo
      .createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId })
      .orderBy('a.createdAt', 'DESC')
      .skip(dto.skip)
      .take(dto.limit)
      .getManyAndCount()
    return paginate(adjustments[0], adjustments[1], dto)
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async writeLedger(data: Partial<InventoryLedger>): Promise<InventoryLedger> {
    const entry = this.ledgerRepo.create(data)
    return this.ledgerRepo.save(entry)
  }

  private async generateItemCode(tenantId: string): Promise<string> {
    const count = await this.itemRepo.count({ where: { tenantId } })
    const padded = String(count + 1).padStart(6, '0')
    return `ITM-${padded}`
  }

  private async generateTransferNumber(tenantId: string): Promise<string> {
    const count = await this.transferRepo.count({ where: { tenantId } })
    const padded = String(count + 1).padStart(4, '0')
    return `TRF-${padded}`
  }

  private async generateAdjustmentNumber(tenantId: string): Promise<string> {
    const count = await this.adjustmentRepo.count({ where: { tenantId } })
    const padded = String(count + 1).padStart(4, '0')
    return `ADJ-${padded}`
  }
}
