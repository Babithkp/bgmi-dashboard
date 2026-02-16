import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const players = await prisma.player.findMany({
            include: {
                team: {
                    select:{
                        id: true,
                        name: true,
                    }
                }
            }
        });        
        return NextResponse.json(players);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
    }
}

