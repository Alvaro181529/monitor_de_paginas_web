import mongoose, { Schema, Document, Model } from 'mongoose';
import { ServiceStatus } from './Service';

export interface ICheckLog extends Document {
  serviceId: mongoose.Types.ObjectId;
  status: ServiceStatus;
  statusCode?: number;
  responseTime?: number; // ms
  errorMessage?: string;
  createdAt: Date;
}

const CheckLogSchema = new Schema<ICheckLog>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'MonitoredService',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['up', 'down', 'degraded'],
      required: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    responseTime: {
      type: Number,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'monitored_checklogs',
  }
);

// TTL index to automatically purge check logs older than 30 days if desired
CheckLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const CheckLog: Model<ICheckLog> =
  mongoose.models.MonitoredCheckLog ||
  mongoose.model<ICheckLog>('MonitoredCheckLog', CheckLogSchema, 'monitored_checklogs');
