import { uploadToS3 } from "@/lib/fileUpload";import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        players: {
          select: {
            id: true,
            name: true,
            image: true,
            gameName: true,
            order: true,
          },
        },
      },
    });
    return NextResponse.json(teams);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const shortName = formData.get("shortName") as string;
    const teamId = formData.get("teamId") as string | null;

    const logo = formData.get("logo") as File | null;
    const editLogo = formData.get("editLogo") as string | null;
    const playersRaw = formData.get("players") as string;

    const groupImage = formData.get("groupImage") as File | null;
    const editGroupImage = formData.get("editGroupImage") as string | null;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Team name required" },
        { status: 400 },
      );
    }

    let imageUrl = editLogo || "";
    let groupImageUrl = editGroupImage || "";

    async function GetImageUrl(image: File) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const ext = image.name.split(".").pop() || "jpg";
      const key = `dashboard/teams/${name}-${Date.now()}.${ext}`;
      return await uploadToS3(buffer, key, image.type);
    }

    if (logo && logo.size > 0) {
      imageUrl = await GetImageUrl(logo);
    }
    if (groupImage && groupImage.size > 0) {
      groupImageUrl = await GetImageUrl(groupImage);
    }

    const players = JSON.parse(playersRaw);

    let savedTeam;

    if (!teamId) {
      savedTeam = await prisma.team.create({
        data: { name, image: imageUrl, shortName, groupImage: groupImageUrl },
      });
    } else {
      savedTeam = await prisma.team.update({
        where: { id: teamId },
        data: { name, image: imageUrl,shortName, groupImage: groupImageUrl },
      });
    }

    for (const p of players) {
      await prisma.player.update({
        where: { id: p.id },
        data: {
          order: p.order,
          teamId: savedTeam.id,
        },
      });
    }

    return NextResponse.json(savedTeam);
  } catch (error) {
    console.error("TEAM SAVE ERROR:", error);

    return NextResponse.json({ error: "Failed to save team" }, { status: 500 });
  }
}
