"use server";
import { prisma } from "./prisma";
import { uploadToS3 } from "./fileUpload";


export async function createPlayerAction(formData: FormData) {
    const name = formData.get('name') as string
    const ign = formData.get('ign') as string
    const teamId = formData.get('team') as string
    const image = formData.get('photo') as File
    const editImage = formData.get('editImage') as string
    const playerId = formData.get('player') as string

    let imageUrl = editImage || ""   

    if (image instanceof File && image.size > 0) {
        const buffer = Buffer.from(await image.arrayBuffer())
        const ext = image.name.split(".").pop() || "jpg"
        const key = `dashboard/players/${name}-${Date.now()}.${ext}`

        imageUrl = await uploadToS3(buffer, key, image.type)
    }

    if (!playerId) {
        await prisma.player.create({
            data: {
                name,
                gameName: ign,
                teamId: teamId,
                image: imageUrl,
            }
        })
    } else {
        await prisma.player.update({
            where: { id: playerId },
            data: {
                name,
                gameName: ign,
                teamId: teamId,
                image: imageUrl,
            }
        })
    }
}


export async function createTeamAction(formData: FormData) {
    const name = formData.get('name') as string
    const teamId = formData.get('team') as string
    const image = formData.get('image')
    const editImage = formData.get('editImage') as string

    let imageUrl = editImage || ""   

    if (image instanceof File && image.size > 0) {
        const buffer = Buffer.from(await image.arrayBuffer())
        const ext = image.name.split(".").pop() || "jpg"
        const key = `dashboard/teams/${name}-${Date.now()}.${ext}`

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


