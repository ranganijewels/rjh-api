import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Supplier, SupplierStatus } from '../../database/entities/supplier.entity'
import { SupplierDocument } from '../../database/entities/supplier-document.entity'
import { VendorKarigar } from '../../database/entities/vendor-karigar.entity'
import {
  PurchaseRequest,
  PurchaseRequestStatus,
} from '../../database/entities/purchase-request.entity'
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../../database/entities/purchase-order.entity'
import { GoodsInward, GoodsInwardStatus } from '../../database/entities/goods-inward.entity'
import { InventoryItem, ItemType, ItemStatus } from '../../database/entities/inventory-item.entity'
import { InventoryLedger, LedgerTransactionType, LedgerReferenceType } from '../../database/entities/inventory-ledger.entity'
import { InventoryLocation } from '../../database/entities/inventory-location.entity'
import { PaginationDto, paginate, getSkip } from '../../common/dto/pagination.dto'

@Injectable()
export class ProcurementService {
  private readonly logger = new Logger(ProcurementService.name)

  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,

    @InjectRepository(SupplierDocument)
    private readonly supplierDocRepo: Repository<SupplierDocument>,

    @InjectRepository(VendorKarigar)
    private readonly vendorRepo: Repository<VendorKarigar>,

    @InjectRepository(PurchaseRequest)
    private readonly prRepo: Repository<PurchaseRequest>,

    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,

    @InjectRepository(GoodsInward)
    private readonly grnRepo: Repository<GoodsInward>,

    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepo: Repository<InventoryItem>,

    @InjectRepository(InventoryLedger)
    private readonly ledgerRepo: Repository<InventoryLedger>,

    @InjectRepository(InventoryLocation)
    private readonly locationRepo: Repository<InventoryLocation>,
  ) {}

  // ─── Suppliers ───────────────────────────────────────────────────────────

  async getSuppliers(tenantId: string, dto: PaginationDto) {
    const qb = this.supplierRepo
      .createQueryBuilder('s')
      .where('s.tenantId = :tenantId', { tenantId })
      .andWhere('s.isDeleted = false')

    if (dto.search) {
      qb.andWhere(
        '(s.supplierName ILIKE :search OR s.supplierCode ILIKE :search OR s.phone ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    const sortField = dto.sortBy || 'createdAt'
    const sortDir = (dto.sortDir?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
    qb.orderBy(`s.${sortField}`, sortDir)
    qb.skip(getSkip(dto)).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getSupplier(tenantId: string, id: string): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({
      where: { id, tenantId, isDeleted: false },
    })
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`)
    return supplier
  }

  async createSupplier(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<Supplier> {
    const supplierCode = dto.supplierCode || (await this.generateSupplierCode(tenantId))
    const supplier = this.supplierRepo.create({
      ...dto,
      tenantId,
      supplierCode,
      createdBy: userId,
    })
    return this.supplierRepo.save(supplier)
  }

  async updateSupplier(
    tenantId: string,
    id: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<Supplier> {
    const supplier = await this.getSupplier(tenantId, id)
    Object.assign(supplier, dto)
    return this.supplierRepo.save(supplier)
  }

  async blacklistSupplier(
    tenantId: string,
    id: string,
    reason: string,
    userId: string,
  ): Promise<Supplier> {
    const supplier = await this.getSupplier(tenantId, id)
    supplier.status = SupplierStatus.BLACKLISTED
    supplier.notes = reason
      ? `[BLACKLISTED by ${userId}]: ${reason}\n${supplier.notes || ''}`
      : supplier.notes
    return this.supplierRepo.save(supplier)
  }

  // ─── Vendors ─────────────────────────────────────────────────────────────

  async getVendors(tenantId: string, dto: PaginationDto) {
    const qb = this.vendorRepo
      .createQueryBuilder('v')
      .where('v.tenantId = :tenantId', { tenantId })
      .andWhere('v.isDeleted = false')

    if (dto.search) {
      qb.andWhere(
        '(v.vendorName ILIKE :search OR v.vendorCode ILIKE :search OR v.phone ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    const sortField = dto.sortBy || 'createdAt'
    const sortDir = (dto.sortDir?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
    qb.orderBy(`v.${sortField}`, sortDir)
    qb.skip(getSkip(dto)).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async createVendor(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<VendorKarigar> {
    const vendorCode = dto.vendorCode || (await this.generateVendorCode(tenantId))
    const vendor = this.vendorRepo.create({
      ...dto,
      tenantId,
      vendorCode,
      createdBy: userId,
    })
    return this.vendorRepo.save(vendor)
  }

  async updateVendor(
    tenantId: string,
    id: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<VendorKarigar> {
    const vendor = await this.vendorRepo.findOne({
      where: { id, tenantId, isDeleted: false },
    })
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`)
    Object.assign(vendor, dto)
    return this.vendorRepo.save(vendor)
  }

  // ─── Purchase Requests ───────────────────────────────────────────────────

  async getPRs(tenantId: string, dto: PaginationDto) {
    const qb = this.prRepo
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.supplier', 'supplier')
      .where('pr.tenantId = :tenantId', { tenantId })

    if (dto.search) {
      qb.andWhere(
        '(pr.prNumber ILIKE :search OR pr.supplierName ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    qb.orderBy('pr.createdAt', 'DESC')
    qb.skip(getSkip(dto)).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getPR(tenantId: string, id: string): Promise<PurchaseRequest> {
    const pr = await this.prRepo.findOne({
      where: { id, tenantId },
      relations: ['supplier'],
    })
    if (!pr) throw new NotFoundException(`Purchase Request ${id} not found`)
    return pr
  }

  async createPR(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<PurchaseRequest> {
    const prNumber = await this.generatePRNumber(tenantId)
    const pr = this.prRepo.create({
      ...dto,
      tenantId,
      prNumber,
      requestedBy: userId,
      status: PurchaseRequestStatus.DRAFT,
    })
    return this.prRepo.save(pr)
  }

  async approvePR(tenantId: string, id: string, userId: string): Promise<PurchaseRequest> {
    const pr = await this.getPR(tenantId, id)
    if (pr.status !== PurchaseRequestStatus.DRAFT && pr.status !== PurchaseRequestStatus.SUBMITTED) {
      throw new BadRequestException(`PR cannot be approved in status: ${pr.status}`)
    }
    pr.status = PurchaseRequestStatus.APPROVED
    pr.approvedBy = userId
    pr.approvedAt = new Date()
    return this.prRepo.save(pr)
  }

  async rejectPR(
    tenantId: string,
    id: string,
    reason: string,
    userId: string,
  ): Promise<PurchaseRequest> {
    const pr = await this.getPR(tenantId, id)
    if (pr.status === PurchaseRequestStatus.APPROVED || pr.status === PurchaseRequestStatus.CANCELLED) {
      throw new BadRequestException(`PR cannot be rejected in status: ${pr.status}`)
    }
    pr.status = PurchaseRequestStatus.REJECTED
    pr.rejectionReason = reason
    pr.approvedBy = userId
    return this.prRepo.save(pr)
  }

  // ─── Purchase Orders ─────────────────────────────────────────────────────

  async getPOs(tenantId: string, dto: PaginationDto) {
    const qb = this.poRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.purchaseRequest', 'pr')
      .where('po.tenantId = :tenantId', { tenantId })

    if (dto.search) {
      qb.andWhere(
        '(po.poNumber ILIKE :search OR po.supplierName ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    qb.orderBy('po.createdAt', 'DESC')
    qb.skip(getSkip(dto)).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getPO(tenantId: string, id: string): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOne({
      where: { id, tenantId },
      relations: ['supplier', 'purchaseRequest'],
    })
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`)
    return po
  }

  async createPO(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<PurchaseOrder> {
    const poNumber = await this.generatePONumber(tenantId)
    const po = this.poRepo.create({
      ...dto,
      tenantId,
      poNumber,
      createdBy: userId,
      status: PurchaseOrderStatus.DRAFT,
    })
    return this.poRepo.save(po)
  }

  async sendPO(tenantId: string, id: string, userId: string): Promise<PurchaseOrder> {
    const po = await this.getPO(tenantId, id)
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(`PO cannot be sent in status: ${po.status}`)
    }
    po.status = PurchaseOrderStatus.SENT
    return this.poRepo.save(po)
  }

  // ─── Goods Inward / GRN ──────────────────────────────────────────────────

  async getGRNs(tenantId: string, dto: PaginationDto) {
    const qb = this.grnRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.supplier', 'supplier')
      .leftJoinAndSelect('g.purchaseOrder', 'po')
      .where('g.tenantId = :tenantId', { tenantId })

    if (dto.search) {
      qb.andWhere(
        '(g.grnNumber ILIKE :search OR g.supplierName ILIKE :search OR g.invoiceNumber ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    qb.orderBy('g.createdAt', 'DESC')
    qb.skip(getSkip(dto)).take(dto.limit)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getGRN(tenantId: string, id: string): Promise<GoodsInward> {
    const grn = await this.grnRepo.findOne({
      where: { id, tenantId },
      relations: ['supplier', 'purchaseOrder', 'location'],
    })
    if (!grn) throw new NotFoundException(`GRN ${id} not found`)
    return grn
  }

  async createGRN(
    tenantId: string,
    dto: Record<string, any>,
    userId: string,
  ): Promise<GoodsInward> {
    const grnNumber = await this.generateGRNNumber(tenantId)
    const grn = this.grnRepo.create({
      ...dto,
      tenantId,
      grnNumber,
      receivedBy: userId,
      status: GoodsInwardStatus.PENDING,
    })
    return this.grnRepo.save(grn)
  }

  async acceptGRN(tenantId: string, id: string, userId: string): Promise<GoodsInward> {
    const grn = await this.getGRN(tenantId, id)
    if (grn.status !== GoodsInwardStatus.PENDING && grn.status !== GoodsInwardStatus.UNDER_QC) {
      throw new BadRequestException(`GRN cannot be accepted in status: ${grn.status}`)
    }

    const acceptedItems = (grn.items as Array<Record<string, any>>).filter(
      (item) => item.accepted !== false,
    )
    const rejectedItems = (grn.items as Array<Record<string, any>>).filter(
      (item) => item.accepted === false,
    )

    // Create inventory items for each accepted GRN item
    for (const grnItem of acceptedItems) {
      const itemCode = await this.generateInventoryItemCode(tenantId)
      const inventoryItem = this.inventoryItemRepo.create({
        tenantId,
        itemCode,
        productName: grnItem.productName || grnItem.itemName,
        productCode: grnItem.productCode || itemCode,
        itemType: grnItem.itemType || ItemType.RAW_MATERIAL,
        currentQuantity: grnItem.acceptedQuantity || grnItem.quantity || 1,
        reservedQuantity: 0,
        availableQuantity: grnItem.acceptedQuantity || grnItem.quantity || 1,
        currentLocationId: grn.locationId,
        itemStatus: ItemStatus.AVAILABLE,
        purchasePrice: grnItem.unitPrice || null,
        createdBy: userId,
        metadata: { grnId: grn.id, grnNumber: grn.grnNumber, supplierId: grn.supplierId },
      })
      const savedItem = await this.inventoryItemRepo.save(inventoryItem)

      // Write ledger entry
      const ledgerEntry = this.ledgerRepo.create({
        tenantId,
        itemId: savedItem.id,
        transactionType: LedgerTransactionType.PURCHASE,
        quantity: savedItem.currentQuantity,
        balanceBefore: 0,
        balanceAfter: savedItem.currentQuantity,
        referenceType: LedgerReferenceType.PURCHASE_ORDER,
        referenceId: grn.purchaseOrderId || grn.id,
        toLocationId: grn.locationId,
        notes: `Goods received from ${grn.supplierName} - GRN: ${grn.grnNumber}`,
        createdBy: userId,
      })
      await this.ledgerRepo.save(ledgerEntry)
    }

    grn.status =
      rejectedItems.length > 0
        ? GoodsInwardStatus.PARTIALLY_ACCEPTED
        : GoodsInwardStatus.ACCEPTED
    grn.qcBy = userId
    grn.qcCompletedAt = new Date()

    return this.grnRepo.save(grn)
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async generateSupplierCode(tenantId: string): Promise<string> {
    const count = await this.supplierRepo.count({ where: { tenantId } })
    return `SUP-${String(count + 1).padStart(4, '0')}`
  }

  private async generateVendorCode(tenantId: string): Promise<string> {
    const count = await this.vendorRepo.count({ where: { tenantId } })
    return `VND-${String(count + 1).padStart(4, '0')}`
  }

  private async generatePRNumber(tenantId: string): Promise<string> {
    const count = await this.prRepo.count({ where: { tenantId } })
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `PR-${date}-${String(count + 1).padStart(4, '0')}`
  }

  private async generatePONumber(tenantId: string): Promise<string> {
    const count = await this.poRepo.count({ where: { tenantId } })
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `PO-${date}-${String(count + 1).padStart(4, '0')}`
  }

  private async generateGRNNumber(tenantId: string): Promise<string> {
    const count = await this.grnRepo.count({ where: { tenantId } })
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `GRN-${date}-${String(count + 1).padStart(4, '0')}`
  }

  private async generateInventoryItemCode(tenantId: string): Promise<string> {
    const count = await this.inventoryItemRepo.count({ where: { tenantId } })
    return `ITM-${String(count + 1).padStart(6, '0')}`
  }
}
