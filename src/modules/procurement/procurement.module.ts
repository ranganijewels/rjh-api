import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Supplier } from '../../database/entities/supplier.entity'
import { SupplierDocument } from '../../database/entities/supplier-document.entity'
import { VendorKarigar } from '../../database/entities/vendor-karigar.entity'
import { PurchaseRequest } from '../../database/entities/purchase-request.entity'
import { PurchaseOrder } from '../../database/entities/purchase-order.entity'
import { GoodsInward } from '../../database/entities/goods-inward.entity'
import { InventoryItem } from '../../database/entities/inventory-item.entity'
import { InventoryLedger } from '../../database/entities/inventory-ledger.entity'
import { InventoryLocation } from '../../database/entities/inventory-location.entity'
import { ProcurementService } from './procurement.service'
import { ProcurementController } from './procurement.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      SupplierDocument,
      VendorKarigar,
      PurchaseRequest,
      PurchaseOrder,
      GoodsInward,
      InventoryItem,
      InventoryLedger,
      InventoryLocation,
    ]),
  ],
  providers: [ProcurementService],
  controllers: [ProcurementController],
  exports: [ProcurementService],
})
export class ProcurementModule {}
