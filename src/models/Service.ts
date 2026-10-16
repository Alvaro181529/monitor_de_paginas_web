import mongoose, { Schema, Document, Model } from 'mongoose';

export type ServiceStatus = 'up' | 'down' | 'degraded' | 'unknown';

export interface IService extends Document {
  name: string;
  url: string;
  status: ServiceStatus;
  statusCode?: number;
  responseTime?: number; // en milisegundos
  checkInterval: number; // en segundos (por defecto 60)
  expectedStatus: number; // por defecto 200
  timeout: number; // en ms (por defecto 10000)
  lastCheck?: Date;
  lastStatusChange?: Date;
  lastError?: string;
  uptimePercent: number; // 0 - 100
  totalChecks: number;
  successfulChecks: number;
  isActive: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del servicio es obligatorio'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'La URL es obligatoria'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['up', 'down', 'degraded', 'unknown'],
      default: 'unknown',
    },
    statusCode: {
      type: Number,
      default: null,
    },
    responseTime: {
      type: Number,
      default: null,
    },
    checkInterval: {
      type: Number,
      default: 60,
    },
    expectedStatus: {
      type: Number,
      default: 200,
    },
    timeout: {
      type: Number,
      default: 10000,
    },
    lastCheck: {
      type: Date,
      default: null,
    },
    lastStatusChange: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    uptimePercent: {
      type: Number,
      default: 100,
    },
    totalChecks: {
      type: Number,
      default: 0,
    },
    successfulChecks: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'monitored_services', // Colección dedicada para evitar colisión con 'services' existente
  }
);

// Prevent mongoose re-compilation error in development
export const Service: Model<IService> =
  mongoose.models.MonitoredService ||
  mongoose.model<IService>('MonitoredService', ServiceSchema, 'monitored_services');
