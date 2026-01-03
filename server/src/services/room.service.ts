import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateRoomData {
 description?: string;
 isPublic?: boolean;
 maxUsers?: number;
 password?: string;
 layout?: string;
}

export class RoomService {
 static async createRoom(ownerId: string, data: CreateRoomData) {
 const room = await prisma.room.create({
 data: {
 description: data.description || '',
 ownerId,
 isPublic: data.isPublic !== false,
 maxUsers: data.maxUsers || 25,
 password: data.password,
 layout: data.layout || 'basic',
 },
 include: {
 owner: {
 select: {
 id: true,
 user
 avatar: true,
 },
 },
 },
 });

 return room;
 }

 static async getPublicRooms(limit: number = 20, offset: number = 0) {
 const rooms = await prisma.room.findMany({
 where: { isPublic: true },
 include: {
 owner: {
 select: {
 id: true,
 user
 avatar: true,
 },
 },
 },
 orderBy: { createdAt: 'desc' },
 take: limit,
 skip: offset,
 });

 return rooms;
 }

 static async getRoomById(roomId: string) {
 const room = await prisma.room.findUnique({
 where: { id: roomId },
 include: {
 owner: {
 select: {
 id: true,
 user
 avatar: true,
 },
 },
 },
 });

 if (!room) {
 throw new Error('Salle non trouvée');
 }

 return room;
 }

 static async getUserRooms(userId: string) {
 const rooms = await prisma.room.findMany({
 where: { ownerId: userId },
 orderBy: { createdAt: 'desc' },
 });

 return rooms;
 }

 static async updateRoom(roomId: string, ownerId: string, data: Partial<CreateRoomData>) {
 // Vérifier que l'utilisateur est le propriétaire
 const room = await prisma.room.findUnique({
 where: { id: roomId },
 });

 if (!room) {
 throw new Error('Salle non trouvée');
 }

 if (room.ownerId !== ownerId) {
 throw new Error('Vous n\'êtes pas le propriétaire de cette salle');
 }

 const updatedRoom = await prisma.room.update({
 where: { id: roomId },
 data: {
 ...(data.name && {
 ...(data.description !== undefined && { description: data.description }),
 ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
 ...(data.maxUsers && { maxUsers: data.maxUsers }),
 ...(data.password !== undefined && { password: data.password }),
 },
 });

 return updatedRoom;
 }

 static async deleteRoom(roomId: string, ownerId: string) {
 const room = await prisma.room.findUnique({
 where: { id: roomId },
 });

 if (!room) {
 throw new Error('Salle non trouvée');
 }

 if (room.ownerId !== ownerId) {
 throw new Error('Vous n\'êtes pas le propriétaire de cette salle');
 }

 await prisma.room.delete({
 where: { id: roomId },
 });

 return { message: 'Salle supprimée avec succès' };
 }

 static async saveFurniture(roomId: string, ownerId: string
 const room = await prisma.room.findUnique({
 where: { id: roomId },
 });

 if (!room) {
 throw new Error('Salle non trouvée');
 }

 if (room.ownerId !== ownerId) {
 throw new Error('Vous n\'êtes pas le propriétaire de cette salle');
 }

 const updatedRoom = await prisma.room.update({
 where: { id: roomId },
 data: { furnitures },
 });

 return updatedRoom;
 }
}
