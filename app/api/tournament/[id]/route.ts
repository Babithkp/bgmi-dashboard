import { deleteFromS3, uploadToS3 } from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await context.params
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        groups: {
          select:{
            id:true,
            name:true,
            groupTeamTournament:{
              select:{
                team:true
              }
            }
          }
        },
      }
    })
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(tournament)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch tournament" }, { status: 500 });
  }
}

type groupstype = {
  name: string;
  teamNames: string[];
};

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const formData = await req.formData();

    const groupsRaw = formData.get("groups");
    const nameRaw = formData.get("name");
    const thumbnail = formData.get("thumbnail") as File | null;

    if (!groupsRaw || typeof groupsRaw !== "string") {
      return NextResponse.json({ error: "Invalid groups payload" }, { status: 400 });
    }

    const name =
      typeof nameRaw === "string" && nameRaw.trim()
        ? nameRaw.trim()
        : undefined;

    let groups: groupstype[] = [];

    try {
      groups = JSON.parse(groupsRaw);
    } catch {
      return NextResponse.json({ error: "Malformed groups JSON" }, { status: 400 });
    }

    let imageUrl: string | undefined;

    // ✅ Upload outside transaction
    if (thumbnail && thumbnail.size > 0) {
      const buffer = Buffer.from(await thumbnail.arrayBuffer());
      const ext = thumbnail.name.split(".").pop();
      const key = `dashboard/tournaments/${Date.now()}.${ext}`;

      imageUrl = await uploadToS3(buffer, key, thumbnail.type);
    }

    await prisma.$transaction(async (tx) => {
      // 1️⃣ Update Tournament
      await tx.tournament.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(imageUrl && { image: imageUrl }),
        },
      });

      if (!groups.length) return;

      // 2️⃣ Fetch Existing Groups
      const existingGroups = await tx.group.findMany({
        where: { tournamentId: id },
        include: {
          matches: true,
          groupTeamTournament: true,
        },
      });

      const incomingGroupNames = groups.map(g => g.name.trim());

      // 3️⃣ Delete ONLY groups with NO matches & NOT in incoming
      await tx.group.deleteMany({
        where: {
          tournamentId: id,
          name: { notIn: incomingGroupNames },
          matches: { none: {} },
        },
      });

      // 4️⃣ Upsert Groups
      for (const group of groups) {
        if (!group.name?.trim()) continue;

        const groupName = group.name.trim();

        let dbGroup = existingGroups.find(g => g.name === groupName);

        if (!dbGroup) {
          dbGroup = await tx.group.create({
            data: {
              name: groupName,
              tournamentId: id,
            },
            include: {
              groupTeamTournament: true,
              matches: true,
            },
          });
        }

        if (!group.teamNames?.length) continue;

        // 5️⃣ Resolve Teams
        const teams = await tx.team.findMany({
          where: {
            name: { in: group.teamNames },
          },
        });

        const existingAssignments = dbGroup.groupTeamTournament;
        const existingTeamIds = existingAssignments.map(t => t.teamId);
        const incomingTeamIds = teams.map(t => t.id);

        // 6️⃣ Add new assignments
        const teamsToAdd = teams.filter(t => !existingTeamIds.includes(t.id));

        if (teamsToAdd.length) {
          await tx.groupTeamTournament.createMany({
            data: teamsToAdd.map(team => ({
              groupId: dbGroup.id,
              tournamentId: id,
              teamId: team.id,
            })),
          });
        }

        // 7️⃣ Remove assignments ONLY if group has NO matches
        if (dbGroup.matches.length === 0) {
          await tx.groupTeamTournament.deleteMany({
            where: {
              groupId: dbGroup.id,
              teamId: { notIn: incomingTeamIds },
            },
          });
        }
      }
    });

    // ✅ Query outside transaction
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        matches: true,
        groups: {
          include: {
            groupTeamTournament: {
              include: { team: true },
            },
          },
        },
      },
    });

    if (!updatedTournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTournament);

  } catch (error) {
    console.error("PATCH Tournament Error:", error);

    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }
}




export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }
    await deleteFromS3(tournament.image);
    await prisma.tournament.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete tournament" },
      { status: 500 }
    );
  }
}