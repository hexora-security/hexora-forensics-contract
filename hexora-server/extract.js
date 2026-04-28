import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.RPC_HTTP_ENDPOINTS);

async function findContracts() {
  const latest = await provider.getBlockNumber();

  // olha últimos 20 blocos
  for (let i = latest - 20; i <= latest; i++) {
    const block = await provider.getBlock(i);

    if (!block) continue;

    for (const hash of block.transactions) {
      const tx = await provider.getTransaction(hash);

      if (tx && tx.to === null) {
        const receipt = await provider.getTransactionReceipt(hash);

        if (receipt?.contractAddress) {
          console.log("🆕 Contract:", receipt.contractAddress, "block:", i);
        }
      }
    }
  }
}

findContracts();