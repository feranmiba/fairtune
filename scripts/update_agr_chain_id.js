const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  setChainId: async (agreementId, onChainId) => {
    return prisma.royaltyAgreement.update({
      where: { id: agreementId },
      data: { onChainAgreementId: String(onChainId) },
    });
  },
};
