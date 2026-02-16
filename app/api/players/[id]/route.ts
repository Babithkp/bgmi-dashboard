import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { deleteFromS3 } from "@/lib/fileUpload"

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
        if (player) {
            await deleteFromS3(player.image)
            await prisma.player.delete({
                where: { id }
            })
        }
    } catch (error) {
        console.error("DELETE PLAYER ERROR:", error)
        return NextResponse.json(
            { error: "Failed to delete player" },
            { status: 500 }
        )
    }
}
