import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'admin' | 'operador' | 'observador';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
    },
    role: {
      type: String,
      enum: ['admin', 'operador', 'observador'],
      default: 'operador',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'monitored_users', // Colección aislada para el monitor
  }
);

export const User: Model<IUser> =
  mongoose.models.MonitoredUser ||
  mongoose.model<IUser>('MonitoredUser', UserSchema, 'monitored_users');
