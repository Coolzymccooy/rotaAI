import { prisma } from '../config/db.js';

export const getAllRules = async () => {
  return await prisma.rule.findMany();
};

export const updateRule = async (id: string, data: any) => {
  return await prisma.rule.update({
    where: { id },
    data,
  });
};

export const createRule = async (data: any) => {
  return await prisma.rule.create({
    data,
  });
};
