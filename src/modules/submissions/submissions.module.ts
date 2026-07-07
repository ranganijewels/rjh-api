import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomRequest } from '../../database/entities/custom-request.entity'
import { ResizeRepairRequest } from '../../database/entities/resize-repair-request.entity'
import { Appointment } from '../../database/entities/appointment.entity'
import { ContactSubmission } from '../../database/entities/contact-submission.entity'
import { SubmissionsService } from './submissions.service'
import { SubmissionsController } from './submissions.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomRequest,
      ResizeRepairRequest,
      Appointment,
      ContactSubmission,
    ]),
  ],
  providers: [SubmissionsService],
  controllers: [SubmissionsController],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
