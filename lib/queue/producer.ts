import { Queue } from "bullmq";

const eliminationQueue = new Queue("elimination", {
  connection: {
    url: process.env.REDIS_URL,
  },
});

export const statusChangeQueueCreater = async (teamId: string) => {
  return await eliminationQueue.add("elimination", { teamId });
}