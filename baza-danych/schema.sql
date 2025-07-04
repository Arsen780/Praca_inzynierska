-- Krok 0: Wymagane rozszerzenia w PostgreSQL
-- W obrazie postgres:15-postgis rozszerzenia już są, ale włączenie ich jest bezpieczne.
create EXTENSION if not exists "uuid-ossp";
create extension if not exists postgis;

--Tabela 1 - uzytkownicy
create table users (
	id UUID primary key default uuid_generate_v4(),
	email varchar(255) unique not null,
	hashed_password varchar(255) not null,
	username varchar(255) unique not null,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--tabela 2 - metadane tras
create type route_visibility as enum ('private', 'unlisted','public');

create table routes (
	id UUID primary key default uuid_generate_v4(),
	user_id UUID not null references users(id) on delete cascade,
	name varchar (150) not null,
	description TEXT,
	visibility route_visibility not null default 'private',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
create index idx_routes_user_id on routes(user_id);

--tabela 3 - punkty składowe trasy

create table route_points (
	id BIGSERIAL primary key,
	route_id UUID not null references routes(id) on delete cascade,
	location GEOGRAPHY(PointZ,4326) not null,
	"timestamp" TIMESTAMPTZ not null,
	sequence integer not null,
	CONSTRAINT unique_route_sequence UNIQUE (route_id, sequence)
);

CREATE INDEX idx_route_points_location_gist ON route_points USING GIST(location);
CREATE INDEX idx_route_points_route_id_sequence ON route_points(route_id, sequence ASC);

-- tablea 4 - skeszowane staty tras

create table route_stats (
	route_id UUID primary key references routes(id) on delete cascade,
	total_distance_meters numeric(10,2),
	duration_seconds integer,
	avg_speed_kmh NUMERIC(5, 2),
    max_speed_kmh NUMERIC(5, 2),
    elevation_gain_meters NUMERIC(10, 2),
    elevation_loss_meters NUMERIC(10, 2),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    last_recalculated_at TIMESTAMPTZ NOT NULL
);



