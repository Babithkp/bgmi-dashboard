import { uploadToS3 } from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const teams = await prisma.team.findMany({
            include: {
                players: {
                    select: {
                        name: true,
                        image: true,
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

export async function POST(request: Request) {
    const formData = await request.formData();
    const name = formData.get('name') as string
    const teamId = formData.get('team') as string
    const image = formData.get('image')
    const editImage = formData.get('editImage') as string

    let imageUrl = editImage || ""

    if (image instanceof File && image.size > 0) {
        const buffer = Buffer.from(await image.arrayBuffer())
        const ext = image.name.split(".").pop() || "jpg"
        const key = `dashboard/teams/${name.trim()}-${Date.now()}.${ext}`

        imageUrl = await uploadToS3(buffer, key, image.type)
    }

    if (!teamId) {
        await prisma.team.create({
            data: {
                name,
                image: imageUrl,
            }
        })
    } else {
        await prisma.team.update({
            where: { id: teamId },
            data: {
                name,
                image: imageUrl,
            }
        })
    }
}