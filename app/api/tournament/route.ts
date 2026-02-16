import { uploadToS3 } from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const date = formData.get("date") as string;
    const time = formData.get("time") as string;
    const participatingTeamsRaw = formData.get("participatingTeams") as string;
    const thumbnail = formData.get("thumbnail") as File | null;

    if (!name || !date || !time || !participatingTeamsRaw) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
        );
    }

    try {
        let thumbnailUrl = "";

        if (thumbnail) {
            const buffer = Buffer.from(await thumbnail.arrayBuffer());
            const ext = thumbnail.name.split(".").pop() || "jpg";
            const key = `dashboard/tournaments/${name}-${Date.now()}.${ext}`;

            thumbnailUrl = await uploadToS3(buffer, key, thumbnail.type);

            if (!thumbnailUrl) {
                return NextResponse.json(
                    { error: "Failed to upload thumbnail image" },
                    { status: 500 }
                );
            }
        }

        const tournament = await prisma.tournament.create({
            data: {
                name,
                date: new Date(date),
                time,
                image: thumbnailUrl,
            },
        });

        const participatingTeams: string[] = JSON.parse(participatingTeamsRaw);

        if (participatingTeams.length > 0) {
            await prisma.teamTournament.createMany({
                data: participatingTeams.map((teamId) => ({
                    teamId,
                    tournamentId: tournament.id,
                })),
            });
        }

        return NextResponse.json({ success: true, tournament });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to create tournament" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const tournaments = await prisma.tournament.findMany({
            include: {
                matches: true,
            }
        });       
        return NextResponse.json(tournaments);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch tournaments" }, { status: 500 });
    }
}