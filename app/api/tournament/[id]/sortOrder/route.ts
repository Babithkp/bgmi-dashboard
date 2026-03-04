import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: {
                matches: {
                    select: {
                        sortOrder: true
                    }
                }
            }
        });


        if (!tournament) {
            return NextResponse.json(
                { error: "Tournament not found" },
                { status: 404 }
            );
        }
        return NextResponse.json(tournament.matches[0].sortOrder);

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to fetch tournament" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json(
                { error: "Sort order required" },
                { status: 400 }
            );
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!tournament) {
            return NextResponse.json(
                { error: "Tournament not found" },
                { status: 404 }
            );
        }

        await prisma.match.updateMany({
            where: { tournamentId: id },
            data: { sortOrder: text },
        });

        return NextResponse.json({
            message: "Sort order updated",
            text
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to update sort order" },
            { status: 500 }
        );
    }
}