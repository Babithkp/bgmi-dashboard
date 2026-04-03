export interface PlayerTypes {
    id: string;
    name: string;
    gameName: string;
    image: string;
    order: number;
    team?: TeamTypes | null;
}

export interface TeamTypes {
    id: string;
    name: string;
    shortName:string
    image: string;
    groupImage: string;
    createdAt: string;
    players: PlayerTypes[];
}

export interface TournamentTypes {
    id: string;
    name: string;
    image: string;
    date: Date;
    time: string;
    allDead?: string | null;
    oneAlive?: string | null;
    twoAlive?: string | null;
    threeAlive?: string | null;
    fourAlive?: string | null;
    matches: MatchTypes[];
    groups: GroupTypes[];
}

export interface GroupTypes {
    id: string;
    name: string;
    matches?: MatchTypes[];
    groupTeamTournament?: GroupTeamTournamentTypes[];
}

export interface GroupTeamTournamentTypes {
    id: string;
    group?: GroupTypes;
    tournament?: TournamentTypes;
    team?: TeamTypes;
}

export interface MatchTypes {
    id: string;
    name: string;
    status: string;
    group?: GroupTypes;
    tournament?: TournamentTypes | null;
    winTeam?: MatchTeamTypes | null;
    matchTeam?: MatchTeamTypes[];
}
export interface MatchTeamTypes {
    id: string;
    teamId: string;
    name: string;
    shortName:string
    image: string;
    groupImage: string;
    status?: string | null;
    placementPoints: number;
    totalPoints: number;
    group: string;
    match?: MatchTypes | null;
    playerPerformances: MatchPlayerPerformanceTypes[];
}

export interface MatchPlayerPerformanceTypes {
    id: string;
    name: string;
    image: string;
    finishesPoints: number;
    status: string;
    teamContribution: number;
    matchTeam?: MatchTeamTypes | null;
}

export interface EliminationTeamTypes {
    id: string;
    name: string;
    rank: number;
    image: string;
    status: string;
}

export interface HeadOnPlayersTypes {
    id: string;
    name: string;
    image: string;
    gameName: string;
    totalPoints: number;
    placementPoints: number;
    finishesPoints: number;
    teamContribution: number;
    matchesPlayed: number;
    totalWins: number;
}

export interface HeadOnTeamsTypes {
    id: string;
    name: string;
    image: string;
    groupImage: string;
    totalWins: number;
    matchesPlayed: number;
    totalPoints: number;
    placementPoints: number;
    playersfinishesPoints: number;
}