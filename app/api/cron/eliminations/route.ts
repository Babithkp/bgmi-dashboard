import prisma from "@/lib/prisma";

export async function GET() {
    await runEliminationCron();
    return Response.json({ success: true });
}
export async function runEliminationCron() {
    try {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const matches = await prisma.match.findMany({
            where: {
                status: "Live",
                updatedAt: { lt: twoMinutesAgo },
            },
            select: { id: true },
        });

        for (const match of matches) {
            await prisma.matchTeam.updateMany({
                where: {
                    matchId: match.id,
                    status: "Eliminated",
                },
                data: {
                    status: "Displayed",
                },
            });
        }

        console.log("✅ Eliminations displayed");
    } catch (error) {
        console.error("❌ Cron Error:", error);
    }
}
