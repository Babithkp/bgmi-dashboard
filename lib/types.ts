export interface PlayerTypes {
    id: string;
    name: string;
    gameName: string;
    image: string;
    team?: TeamTypes | null;
}

export interface TeamTypes {
    id: string;
    name: string;
    image: string;
    createdAt: Date;
    players: PlayerTypes[];
}

export interface TournamentTypes {
    id: string;
    name: string;
    image: string;
    date: Date;
    time: string;
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

export interface MatchTeamTypes {
    id: string;
    group: string;
    name: string;
    image: string;
    status: string;
    matchId?: | null;
    match?: MatchTypes | null;
    playerPerformances: MatchPlayerPerformanceTypes[];
}
export interface MatchTypes {
    id: string;
    name: string;
    status?: string | null;
    group?: GroupTypes;
    tournament?: TournamentTypes | null;
    winTeam?: MatchTeamTypes | null;
    matchTeam?: MatchTeamTypes[];
}
export interface MatchTeamTypes {
    id: string;
    name: string;
    image: string;
    status: string;
    group: string;
    match?: MatchTypes | null;
    playerPerformances: MatchPlayerPerformanceTypes[];
}

export interface MatchPlayerPerformanceTypes {
    id: string;
    name: string;
    image: string;
    placementPoints: number;
    finishesPoints: number;
    totalPoints: number;
    status: string;
    teamContribution: number;
    matchTeam?: MatchTeamTypes | null;
}
