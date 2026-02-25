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
    createdAt: string;
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
    name: string;
    image: string;
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
