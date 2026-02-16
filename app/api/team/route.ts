import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const teams = await prisma.team.findMany({
            include: {
                players: {
                    select: {
                        name: true,
                    }
                }
            }
        });
        return NextResponse.json(teams);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
    }
}

