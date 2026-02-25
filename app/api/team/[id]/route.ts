import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { deleteFromS3 } from "@/lib/fileUpload"

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const team = await prisma.team.findUnique({
            where: { id }
        })
        if (!team) {
            return NextResponse.json(
                { error: "Team not found" },
                { status: 404 }
            )
        }
        await deleteFromS3(team.image)
        await prisma.team.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("DELETE TEAM ERROR:", error)
        return NextResponse.json(
            { error: "Failed to delete team" },
            { status: 500 }
        )
    }
}
