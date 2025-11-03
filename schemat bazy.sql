--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-10-16 17:36:38

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3 (class 3079 OID 17709)
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- TOC entry 5766 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- TOC entry 2 (class 3079 OID 17698)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5767 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 1647 (class 1247 OID 18804)
-- Name: route_visibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.route_visibility AS ENUM (
    'private',
    'unlisted',
    'public'
);


ALTER TYPE public.route_visibility OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 227 (class 1259 OID 18829)
-- Name: route_points; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.route_points (
    id bigint NOT NULL,
    route_id uuid NOT NULL,
    location public.geography(PointZ,4326) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    sequence integer NOT NULL
);


ALTER TABLE public.route_points OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 18828)
-- Name: route_points_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.route_points_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.route_points_id_seq OWNER TO postgres;

--
-- TOC entry 5768 (class 0 OID 0)
-- Dependencies: 226
-- Name: route_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.route_points_id_seq OWNED BY public.route_points.id;


--
-- TOC entry 228 (class 1259 OID 18846)
-- Name: route_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.route_stats (
    route_id uuid NOT NULL,
    total_distance_meters numeric(15,2),
    duration_seconds integer,
    avg_speed_kmh numeric(8,2),
    max_speed_kmh numeric(8,2),
    elevation_gain_meters numeric(10,2),
    elevation_loss_meters numeric(10,2),
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    last_recalculated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.route_stats OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 18811)
-- Name: routes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    visibility public.route_visibility DEFAULT 'private'::public.route_visibility NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.routes OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 18789)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    verification_token text,
    avatar_url character varying(2048) DEFAULT NULL::character varying
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5587 (class 2604 OID 18832)
-- Name: route_points id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.route_points ALTER COLUMN id SET DEFAULT nextval('public.route_points_id_seq'::regclass);


--
-- TOC entry 5603 (class 2606 OID 18836)
-- Name: route_points route_points_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.route_points
    ADD CONSTRAINT route_points_pkey PRIMARY KEY (id);


--
-- TOC entry 5607 (class 2606 OID 18850)
-- Name: route_stats route_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.route_stats
    ADD CONSTRAINT route_stats_pkey PRIMARY KEY (route_id);


--
-- TOC entry 5599 (class 2606 OID 18821)
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- TOC entry 5605 (class 2606 OID 18838)
-- Name: route_points unique_route_sequence; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.route_points
    ADD CONSTRAINT unique_route_sequence UNIQUE (route_id, sequence);


--
-- TOC entry 5592 (class 2606 OID 18800)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5594 (class 2606 OID 18798)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5596 (class 2606 OID 18802)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 5600 (class 1259 OID 18844)
-- Name: idx_route_points_location_gist; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_route_points_location_gist ON public.route_points USING gist (location);


--
-- TOC entry 5601 (class 1259 OID 18845)
-- Name: idx_route_points_route_id_sequence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_route_points_route_id_sequence ON public.route_points USING btree (route_id, sequence);


--
-- TOC entry 5597 (class 1259 OID 18827)
-- Name: idx_routes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_routes_user_id ON public.routes USING btree (user_id);


--
-- TOC entry 5609 (class 2606 OID 18839)
-- Name: route_points route_points_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.route_points
    ADD CONSTRAINT route_points_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- TOC entry 5610 (class 2606 OID 18851)
-- Name: route_stats route_stats_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.route_stats
    ADD CONSTRAINT route_stats_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- TOC entry 5608 (class 2606 OID 18822)
-- Name: routes routes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2025-10-16 17:36:38

--
-- PostgreSQL database dump complete
--

