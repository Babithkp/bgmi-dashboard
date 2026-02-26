import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { deleteFromS3, uploadToS3 } from "@/lib/fileUpload"

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const player = await prisma.player.findUnique({
            where: { id }
        })
        if (!player) {
            return NextResponse.json(
                { error: "Player not found" },
                { status: 404 }
            )
        }
        if (player.image) {
            await deleteFromS3(player.image)
        }
        await prisma.player.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("DELETE PLAYER ERROR:", error)
        return NextResponse.json(
            { error: "Failed to delete player" },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        const existingPlayer = await prisma.player.findUnique({
            where: { id },
        });

        if (!existingPlayer) {
            return NextResponse.json(
                { error: "Player not found" },
                { status: 404 }
            );
        }

        const formData = await request.formData();

        const name = formData.get("name") as string;
        const gameName = formData.get("gameName") as string;
        const imageFile = formData.get("photo") as File | null;
        const teamId = formData.get("team") as string | null;

        if (!name?.trim()) {
            return NextResponse.json(
                { error: "Player name required" },
                { status: 400 }
            );
        }

        let imageUrl = existingPlayer.image;

        if (imageFile && imageFile.size > 0) {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const ext = imageFile.name.split(".").pop() || "jpg";
            const key = `dashboard/players/${name}-${Date.now()}.${ext}`;

            imageUrl = await uploadToS3(buffer, key, imageFile.type);
        }

        const updatedPlayer = await prisma.player.update({
            where: { id },
            data: {
                name,
                gameName,
                image: imageUrl,
                teamId,
            },
        });

        return NextResponse.json(updatedPlayer);

    } catch (error) {
        console.error("PLAYER PATCH ERROR:", error);

        return NextResponse.json(
            { error: "Failed to update player" },
            { status: 500 }
        );
    }
}