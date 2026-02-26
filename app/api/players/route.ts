import { uploadToS3 } from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const players = await prisma.player.findMany({
            include: {
                team: {
                    select: {
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

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const name = formData.get("name") as string;
        const gameName = formData.get("gameName") as string;
        const imageFile = formData.get("image") as File | null;

        if (!name?.trim()) {
            return NextResponse.json(
                { error: "Player name required" },
                { status: 400 }
            );
        }

        let imageUrl = "";

        if (imageFile && imageFile.size > 0) {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const ext = imageFile.name.split(".").pop() || "jpg";
            const key = `dashboard/players/${name}-${Date.now()}.${ext}`;

            imageUrl = await uploadToS3(buffer, key, imageFile.type);
        }

        const player = await prisma.player.create({
            data: {
                name,
                gameName,
                image: imageUrl,
                order: 0,
            },
        });

        return NextResponse.json(player);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}