import prisma from "@/lib/prisma";
import { Worker } from "bullmq";
import "dotenv/config";

const worker = new Worker(
  "elimination",
  async (job) => {
    const { teamId } = job.data;
    console.log("From worker", teamId);
    await prisma.matchTeam.update({
      where: {
        id: teamId,
      },
      data: {
        status: "Displayed",
      },
    });

    console.log(`✅ Team ${teamId} displayed`);
  },
  {
    connection: {
      url: process.env.REDIS_URL,
    },
  }
);

worker.on("completed", (job) => {
  console.log(`🎉 Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job failed: ${job?.id}`, err);
});