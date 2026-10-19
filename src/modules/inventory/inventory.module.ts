import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InventoryItem } from '../../database/entities/inventory-item.entity'
import { InventoryLocation } from '../../database/entities/inventory-location.entity'
import { InventoryLedger } from '../../database/entities/inventory-ledger.entity'
import { StockTransfer } from '../../database/entities/stock-transfer.entity'
import { StockAdjustment } from '../../database/entities/stock-adjustment.entity'
import { StockReservation } from '../../database/entities/stock-reservation.entity'
import { BarcodeQrRecord } from '../../database/entities/barcode-qr-record.entity'
import { InventoryService } from './inventory.service'
import { InventoryController } from './inventory.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItem,
      InventoryLocation,
      InventoryLedger,
      StockTransfer,
      StockAdjustment,
      StockReservation,
      BarcodeQrRecord,
    ]),
  ],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
