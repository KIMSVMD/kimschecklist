--
-- PostgreSQL database dump
--

\restrict M3T2KsrFc9FMRw5G5z3NGiiVgdK9DPb1KhzS3xG49GtJfN1jt38PB66YsFnckUx

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: checklist_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_replies (
    id integer NOT NULL,
    checklist_id integer NOT NULL,
    author_type text NOT NULL,
    content text NOT NULL,
    photo_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    photo_urls text[]
);


--
-- Name: checklist_replies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checklist_replies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checklist_replies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checklist_replies_id_seq OWNED BY public.checklist_replies.id;


--
-- Name: checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklists (
    id integer NOT NULL,
    branch text NOT NULL,
    category text NOT NULL,
    product text NOT NULL,
    status text NOT NULL,
    photo_url text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    items jsonb,
    admin_comment text,
    comment_confirmed boolean DEFAULT false,
    staff_reply text,
    year integer,
    month integer,
    admin_score integer,
    admin_items jsonb,
    photo_urls text[],
    updated_at timestamp without time zone,
    ad_items jsonb,
    ad_photo_urls text[],
    ad_admin_score integer,
    ad_admin_items jsonb,
    ad_notes text,
    checklist_type text DEFAULT 'vm'::text,
    quality_items jsonb,
    quality_photo_urls text[],
    quality_notes text,
    quality_admin_score integer,
    quality_admin_items jsonb
);


--
-- Name: checklists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checklists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checklists_id_seq OWNED BY public.checklists.id;


--
-- Name: cleaning_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cleaning_inspections (
    id integer NOT NULL,
    branch text NOT NULL,
    zone text NOT NULL,
    inspection_time text NOT NULL,
    items jsonb,
    overall_status text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    admin_comment text,
    comment_confirmed boolean DEFAULT false,
    staff_reply text
);


--
-- Name: cleaning_inspections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cleaning_inspections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cleaning_inspections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cleaning_inspections_id_seq OWNED BY public.cleaning_inspections.id;


--
-- Name: cleaning_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cleaning_replies (
    id integer NOT NULL,
    cleaning_id integer NOT NULL,
    author_type text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    photo_url text,
    photo_urls text[]
);


--
-- Name: cleaning_replies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cleaning_replies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cleaning_replies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cleaning_replies_id_seq OWNED BY public.cleaning_replies.id;


--
-- Name: guides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guides (
    id integer NOT NULL,
    category text NOT NULL,
    product text NOT NULL,
    image_url text,
    points text[] DEFAULT '{}'::text[] NOT NULL,
    items text[] DEFAULT '{}'::text[] NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    store_type text,
    guide_type text DEFAULT 'vm'::text NOT NULL,
    video_url text,
    image_urls text[],
    valid_from_year integer,
    valid_from_month integer,
    valid_to_year integer,
    valid_to_month integer,
    attach_file_urls text[],
    video_link_url text
);


--
-- Name: guides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guides_id_seq OWNED BY public.guides.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    category text NOT NULL,
    group_name text NOT NULL,
    product_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    file_urls text[],
    brand text,
    spec text,
    display_zone text
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: staff_score_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_score_notifications (
    id integer NOT NULL,
    target_type text NOT NULL,
    branch text NOT NULL,
    checklist_id integer,
    cleaning_id integer,
    item_name text NOT NULL,
    old_status text,
    new_status text NOT NULL,
    product text,
    category text,
    zone text,
    inspection_time text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    guide_type text
);


--
-- Name: staff_score_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_score_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_score_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_score_notifications_id_seq OWNED BY public.staff_score_notifications.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: checklist_replies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_replies ALTER COLUMN id SET DEFAULT nextval('public.checklist_replies_id_seq'::regclass);


--
-- Name: checklists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists ALTER COLUMN id SET DEFAULT nextval('public.checklists_id_seq'::regclass);


--
-- Name: cleaning_inspections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaning_inspections ALTER COLUMN id SET DEFAULT nextval('public.cleaning_inspections_id_seq'::regclass);


--
-- Name: cleaning_replies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaning_replies ALTER COLUMN id SET DEFAULT nextval('public.cleaning_replies_id_seq'::regclass);


--
-- Name: guides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guides ALTER COLUMN id SET DEFAULT nextval('public.guides_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: staff_score_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_score_notifications ALTER COLUMN id SET DEFAULT nextval('public.staff_score_notifications_id_seq'::regclass);


--
-- Data for Name: checklist_replies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.checklist_replies (id, checklist_id, author_type, content, photo_url, created_at, photo_urls) FROM stdin;
8	8	staff	네	\N	2026-03-09 03:16:33.775671	\N
9	8	admin	(사진 첨부)	/objects/uploads/25ba8b9e-96f9-4a97-b051-b2d0c4565240	2026-03-09 06:48:24.099134	{/objects/uploads/25ba8b9e-96f9-4a97-b051-b2d0c4565240,/objects/uploads/cedb93dc-a1f4-46c5-b7a6-6b226a52dca2}
10	9	admin	ㅇㄹㅇㄹㅇ	\N	2026-03-18 04:35:15.467871	\N
\.


--
-- Data for Name: checklists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.checklists (id, branch, category, product, status, photo_url, notes, created_at, items, admin_comment, comment_confirmed, staff_reply, year, month, admin_score, admin_items, photo_urls, updated_at, ad_items, ad_photo_urls, ad_admin_score, ad_admin_items, ad_notes, checklist_type, quality_items, quality_photo_urls, quality_notes, quality_admin_score, quality_admin_items) FROM stdin;
8	강서	농산	[수입과일]바나나	poor	\N	집기 부족합니다 (바나나구 10개)	2026-03-09 03:14:07.042256	{"광고: 상단 바나나 셀링": "ok", "연출: 잎 그래픽 바닥 시트": "ok", "위치: 매장 입구 기둥(위치 고정화)": "ok", "진열③: 곡면 소도구 활용하여 진열": "ok", "면적: 앵커 60% / 유기농20% / 프리미엄20%": "ok", "상품: 바나나 3SKU(앵커/유기농/프리미엄)": "notok", "진열①: 앵커 → 유기농 → 프리미엄순 진열": "ok", "진열②: 후숙도 구분 진열(덜익 → 중강 → 잘익순)": "ok"}	집기 발주하겠습니다 금주 목요일 입고 예정	t	\N	2026	3	75	{"광고: 상단 바나나 셀링": "notok", "연출: 잎 그래픽 바닥 시트": "notok", "위치: 매장 입구 기둥(위치 고정화)": "ok", "진열③: 곡면 소도구 활용하여 진열": "ok", "면적: 앵커 60% / 유기농20% / 프리미엄20%": "ok", "상품: 바나나 3SKU(앵커/유기농/프리미엄)": "ok", "진열①: 앵커 → 유기농 → 프리미엄순 진열": "ok", "진열②: 후숙도 구분 진열(덜익 → 중강 → 잘익순)": "ok"}	\N	\N	\N	\N	\N	\N	\N	vm	\N	\N	\N	\N	\N
9	강서	농산	[시즌]오렌지	excellent	/objects/uploads/701735aa-543e-4353-b71c-168b905eb907	\N	2026-03-09 06:20:29.565735	{"진열 상품: 필수 상품[네이블/카라카라 벌크], 구색상품[봉규격] 구성하였는가?": "ok"}	ㅇㅇㅇ	f	\N	2026	3	100	{"진열 상품: 필수 상품[네이블/카라카라 벌크], 구색상품[봉규격] 구성하였는가?": "ok"}	{/objects/uploads/701735aa-543e-4353-b71c-168b905eb907,/objects/uploads/fdb3cdab-3521-4448-bdbc-c7b27b2681ec}	\N	\N	\N	\N	\N	\N	vm	\N	\N	\N	\N	\N
13	일산	농산	[수입과일]바나나	excellent	\N	\N	2026-03-10 05:35:34.749736	{}	\N	f	\N	2026	3	\N	\N	\N	\N	\N	\N	\N	\N	\N	ad	\N	\N	\N	\N	\N
14	송파	축산	[계육]	excellent	/objects/uploads/284ab9b2-7ea0-4066-8f69-9c044db33201	\N	2026-03-10 07:34:32.495512	{}	\N	f	\N	2026	3	50	{}	{/objects/uploads/284ab9b2-7ea0-4066-8f69-9c044db33201}	\N	\N	\N	\N	\N	\N	vm	\N	\N	\N	\N	\N
16	강남	농산	[수입과일]바나나	poor	\N	ㅎ	2026-04-02 05:12:23.173882	{"연출: 잎 그래픽 바닥 시트": "ok", "위치: 매장 입구 기둥(위치 고정화)": "notok", "진열③: 곡면 소도구 활용하여 진열": "ok", "면적: 앵커 60% / 유기농20% / 프리미엄20%": "notok", "상품: 바나나 3SKU(앵커/유기농/프리미엄)": "notok", "진열①: 앵커 → 유기농 → 프리미엄순 진열": "notok", "진열②: 후숙도 구분 진열(덜익 → 중강 → 잘익순)": "ok"}	\N	f	\N	2026	4	\N	\N	\N	\N	{"22": "ok"}	\N	\N	\N	ㅏ	vm	\N	\N	\N	\N	\N
\.


--
-- Data for Name: cleaning_inspections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cleaning_inspections (id, branch, zone, inspection_time, items, overall_status, created_at, admin_comment, comment_confirmed, staff_reply) FROM stdin;
17	강서	입구	오픈	{"카트 정리 상태": {"memo": null, "status": "ok", "photoUrl": null}}	ok	2026-03-05 04:51:30.335261	점검 후 사진 전송 부탁드립니다	f	\N
9	강서	수산	오픈	{"바닥 청결": {"memo": null, "status": "ok", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	ok	2026-03-05 03:17:27.571498	바닥/진열대 청소 후 사진 보내주세요	t	\N
13	송파	입구	오픈	{"카트 정리 상태": {"memo": null, "status": "ok", "photoUrl": null}}	ok	2026-03-05 04:38:02.909859	\N	f	\N
16	강서	공산	마감	{"바닥 청결": {"memo": null, "status": "ok", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	ok	2026-03-05 04:50:02.056265	\N	f	\N
8	강서	축산	오픈	{"바닥 청결": {"memo": null, "status": "ok", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	ok	2026-03-05 02:04:21.673569	바닥 진열대 청소 부탁드립니다	t	\N
11	강서	입구	마감	{"카트 정리 상태": {"memo": null, "status": "ok", "photoUrl": null}}	ok	2026-03-05 04:36:48.735239	\N	f	\N
12	강서	농산	마감	{"바닥 청결": {"memo": null, "status": "issue", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "issue", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "issue", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	issue	2026-03-05 04:36:58.879758	확인부탁드립니다	t	\N
18	송파	농산	오픈	{"바닥 청결": {"memo": null, "status": "issue", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	issue	2026-03-05 04:51:47.840811	\N	f	\N
19	송파	축산	오픈	{"바닥 청결": {"memo": null, "status": "issue", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	issue	2026-03-05 04:52:31.128168	\N	f	\N
14	강서	축산	마감	{"바닥 청결": {"memo": null, "status": "ok", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	ok	2026-03-05 04:44:29.725887	확인부탁드립니다	t	\N
10	강서	공산	오픈	{"바닥 청결": {"memo": null, "status": "ok", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "issue", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	issue	2026-03-05 03:50:36.458924	확인부탁드립니다	t	\N
20	송파	수산	오픈	{"바닥 청결": {"memo": null, "status": "issue", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "issue", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	issue	2026-03-05 04:52:43.299533	\N	f	\N
21	강서	농산	오픈	{"바닥 청결": {"memo": null, "status": "ok", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "issue", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	issue	2026-03-05 05:46:14.300878	확인 부탁드립니다	t	\N
22	강서	입구	오픈	{"카트 정리 상태": {"memo": null, "status": "ok", "photoUrl": null}}	ok	2026-03-09 02:15:46.884984	\N	f	\N
23	강서	농산	오픈	{"바닥 청결": {"memo": null, "status": "ok", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	ok	2026-03-09 03:18:26.550661	\N	f	\N
15	강서	수산	마감	{"바닥 청결": {"memo": null, "status": "ok", "photoUrl": null}, "상품 상태": {"memo": null, "status": "ok", "photoUrl": null}, "가격표 상태": {"memo": null, "status": "ok", "photoUrl": null}, "진열대 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기통 상태": {"memo": null, "status": "ok", "photoUrl": null}, "메인 통로 청결": {"memo": null, "status": "ok", "photoUrl": null}, "폐기 상품 여부": {"memo": null, "status": "ok", "photoUrl": null}, "쇼케이스 유리 청결": {"memo": null, "status": "ok", "photoUrl": null}, "행사매대 주변 청결": {"memo": null, "status": "ok", "photoUrl": null}}	ok	2026-03-05 04:49:54.79279	확인부탁드립니다	t	\N
24	강서	입구	마감	{"카트 정리 상태": {"memo": null, "status": "issue", "photoUrl": null}}	issue	2026-03-09 03:56:28.474428	\N	f	\N
\.


--
-- Data for Name: cleaning_replies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cleaning_replies (id, cleaning_id, author_type, content, created_at, photo_url, photo_urls) FROM stdin;
2	8	staff	바닥청소 완료했습니다	2026-03-05 02:09:41.744815	\N	\N
3	8	admin	네	2026-03-05 02:09:56.901728	\N	\N
4	8	staff	완료했습니다	2026-03-05 02:15:27.409054	\N	\N
5	8	staff	(사진 첨부)	2026-03-05 02:16:39.626469	\N	\N
6	8	staff	(사진 첨부)	2026-03-05 03:15:23.678745	/objects/uploads/bfc7f5cb-1d6f-429d-80e0-0e4c3c32a42f	\N
7	9	staff	완료했습니다	2026-03-05 03:18:21.716021	/objects/uploads/4d7b7971-7bac-4f0f-89ac-1d1f0cdc8711	\N
8	9	admin	네	2026-03-05 03:33:49.827093	\N	\N
9	8	admin	네 감사합니다	2026-03-05 03:34:52.845202	\N	\N
10	15	staff	완료 했습니다	2026-03-05 05:15:59.746606	/objects/uploads/6c19227c-2b3a-4487-a093-55b66a7b04a6	\N
11	15	admin	네 확인 했습니다	2026-03-05 05:16:16.162079	\N	\N
12	12	staff	완료했습니다	2026-03-05 05:20:14.092618	/objects/uploads/c6368087-8e44-44fa-b5be-cd99ad29adee	\N
13	14	staff	확인하겠습니다	2026-03-05 05:23:36.958367	\N	\N
\.


--
-- Data for Name: guides; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guides (id, category, product, image_url, points, items, updated_at, store_type, guide_type, video_url, image_urls, valid_from_year, valid_from_month, valid_to_year, valid_to_month, attach_file_urls, video_link_url) FROM stdin;
3	농산	[시즌]오렌지	/objects/uploads/d4c87ebf-72b3-42fb-b5c4-8472f2f40803	{"진열 상품: 필수 상품[네이블/카라카라 벌크], 구색상품[만다린팩+ 봉규격] 구성하였는가?"}	{"진열 상품: 필수 상품[네이블/카라카라 벌크], 구색상품[만다린팩+ 봉규격] 구성하였는가?"}	2026-03-12 07:45:14.99	대형점	vm	\N	{/objects/uploads/d4c87ebf-72b3-42fb-b5c4-8472f2f40803}	2026	3	2026	4	\N	\N
4	농산	[시즌]오렌지	/objects/uploads/8cb38c24-046c-412a-8434-ee5ac0e3a1fd	{"진열 상품: 필수 상품[네이블/카라카라 벌크], 구색상품[봉규격] 구성하였는가?"}	{"진열 상품: 필수 상품[네이블/카라카라 벌크], 구색상품[봉규격] 구성하였는가?"}	2026-03-12 07:45:40.753	중소형점	vm	\N	{/objects/uploads/8cb38c24-046c-412a-8434-ee5ac0e3a1fd}	2026	3	2026	4	\N	\N
6	농산	[수입과일]바나나	/objects/uploads/32757c48-88df-4326-b956-f7c90404f3b2	{22}	{22}	2026-03-10 07:20:57.311	\N	ad	/objects/uploads/875494e6-634b-479f-9696-c7bf26f74d78	\N	\N	\N	\N	\N	\N	\N
8	축산	[계육]	/objects/uploads/3bdedfdc-8185-4edb-ad65-0e0b916abd2f	{}	{}	2026-03-10 07:34:15.911741	\N	vm	\N	{/objects/uploads/3bdedfdc-8185-4edb-ad65-0e0b916abd2f}	\N	\N	\N	\N	\N	\N
9	농산	[시즌]오렌지	\N	{ㄴ}	{ㄴ}	2026-03-11 01:34:18.218748	\N	vm	\N	\N	2027	3	2027	6	\N	\N
2	농산	[수입과일]바나나	/objects/uploads/070729ec-36fe-4e47-959f-b9675b8fd377	{"위치: 매장 입구 기둥(위치 고정화)","상품: 바나나 3SKU(앵커/유기농/프리미엄)","면적: 앵커 60% / 유기농20% / 프리미엄20%","진열①: 앵커 → 유기농 → 프리미엄순 진열","진열②: 후숙도 구분 진열(덜익 → 중강 → 잘익순)","진열③: 곡면 소도구 활용하여 진열","연출: 잎 그래픽 바닥 시트"}	{"위치: 매장 입구 기둥(위치 고정화)","상품: 바나나 3SKU(앵커/유기농/프리미엄)","면적: 앵커 60% / 유기농20% / 프리미엄20%","진열①: 앵커 → 유기농 → 프리미엄순 진열","진열②: 후숙도 구분 진열(덜익 → 중강 → 잘익순)","진열③: 곡면 소도구 활용하여 진열","연출: 잎 그래픽 바닥 시트"}	2026-03-18 05:30:28.11	\N	vm	\N	{/objects/uploads/070729ec-36fe-4e47-959f-b9675b8fd377,/objects/uploads/ae8a2cd6-b6b4-4da3-89b2-cffbf08b0b50}	\N	\N	\N	\N	\N	\N
10	농산	[데일리]사과	\N	{ㄹ}	{ㄹ}	2026-03-18 21:40:20.423122	\N	quality	\N	\N	\N	\N	\N	\N	\N	\N
11	공산	[건기식]	/objects/uploads/b3ca2c66-c7f3-4bf4-bc99-3ce9c5b4969a	{}	{}	2026-03-19 01:18:49.028	\N	ad	\N	{/objects/uploads/b3ca2c66-c7f3-4bf4-bc99-3ce9c5b4969a}	\N	\N	\N	\N	\N	https://drive.google.com/file/d/1GOXbgM8tUymMmo89xhlEBiqADL1o1hnW/view
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, category, group_name, product_name, created_at, file_urls, brand, spec, display_zone) FROM stdin;
1	농산	시즌	딸기	2026-03-03 22:55:39.748681	\N	\N	\N	\N
2	농산	시즌	만감류	2026-03-03 22:55:43.674453	\N	\N	\N	\N
3	농산	시즌	오렌지	2026-03-03 22:55:47.42238	\N	\N	\N	\N
4	농산	시즌	참외	2026-03-03 22:55:51.142269	\N	\N	\N	\N
5	농산	시즌	수박	2026-03-03 22:55:54.845919	\N	\N	\N	\N
6	농산	시즌	복숭아	2026-03-03 22:55:58.627047	\N	\N	\N	\N
7	농산	시즌	사과	2026-03-03 22:56:02.45835	\N	\N	\N	\N
8	농산	시즌	배	2026-03-03 22:56:06.231078	\N	\N	\N	\N
9	농산	시즌	포도	2026-03-03 22:56:10.139004	\N	\N	\N	\N
10	농산	시즌	감	2026-03-03 22:56:14.163282	\N	\N	\N	\N
11	농산	시즌	감귤	2026-03-03 22:56:17.959119	\N	\N	\N	\N
12	농산	데일리	토마토	2026-03-03 22:56:21.81114	\N	\N	\N	\N
13	농산	데일리	사과	2026-03-03 22:56:25.708157	\N	\N	\N	\N
14	농산	수입과일	바나나	2026-03-03 22:56:29.800624	\N	\N	\N	\N
15	농산	수입과일	수입과일	2026-03-03 22:56:33.578677	\N	\N	\N	\N
16	농산	수입과일	키위	2026-03-03 22:56:37.355129	\N	\N	\N	\N
17	농산	채소	제주채소	2026-03-03 22:56:41.137521	\N	\N	\N	\N
18	농산	양곡	\N	2026-03-03 22:56:45.032494	\N	\N	\N	\N
19	수산	견과	\N	2026-03-03 22:56:48.893442	\N	\N	\N	\N
20	수산	간편식	\N	2026-03-03 22:56:52.705252	\N	\N	\N	\N
21	축산	돈육	\N	2026-03-03 22:56:56.510785	\N	\N	\N	\N
22	축산	한우	암소한우	2026-03-03 22:57:00.323198	\N	\N	\N	\N
23	축산	한우	시즈닝 스테이크	2026-03-03 22:57:04.037647	\N	\N	\N	\N
24	축산	수입육	\N	2026-03-03 22:57:07.994305	\N	\N	\N	\N
25	축산	양념육	\N	2026-03-03 22:57:11.874701	\N	\N	\N	\N
27	공산	직수입	\N	2026-03-03 22:57:19.706044	\N	\N	\N	\N
28	공산	건기식	\N	2026-03-03 22:57:23.528801	\N	\N	\N	\N
29	공산	공산행사장	\N	2026-03-03 22:57:27.344199	\N	\N	\N	\N
30	축산	수입육	와규	2026-03-04 00:13:32.092696	\N	\N	\N	\N
26	축산	계육	\N	2026-03-03 22:57:15.796698	{}	\N	\N	\N
\.


--
-- Data for Name: staff_score_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_score_notifications (id, target_type, branch, checklist_id, cleaning_id, item_name, old_status, new_status, product, category, zone, inspection_time, created_at, guide_type) FROM stdin;
3	cleaning	강서	\N	10	가격표 상태	issue	ok	\N	\N	공산	오픈	2026-03-05 05:26:57.629043	\N
4	vm	강서	7	\N	면적: 앵커 60% / 유기농20% / 프리미엄20%	notok	ok	[수입과일]바나나	농산	\N	\N	2026-03-09 02:29:00.406115	\N
5	vm	강서	7	\N	면적: 앵커 60% / 유기농20% / 프리미엄20%	ok	notok	[수입과일]바나나	농산	\N	\N	2026-03-09 02:29:01.601259	\N
6	vm	강서	7	\N	면적: 앵커 60% / 유기농20% / 프리미엄20%	notok	ok	[수입과일]바나나	농산	\N	\N	2026-03-09 02:29:03.253288	\N
7	vm	강서	7	\N	면적: 앵커 60% / 유기농20% / 프리미엄20%	ok	notok	[수입과일]바나나	농산	\N	\N	2026-03-09 02:29:04.151372	\N
8	vm	강서	7	\N	광고: 상단 바나나 셀링	ok	notok	[수입과일]바나나	농산	\N	\N	2026-03-09 02:34:01.680152	\N
9	vm	강서	7	\N	광고: 상단 바나나 셀링	notok	ok	[수입과일]바나나	농산	\N	\N	2026-03-09 02:34:02.681401	\N
10	vm	강서	7	\N	광고: 상단 바나나 셀링	ok	notok	[수입과일]바나나	농산	\N	\N	2026-03-09 02:37:16.563533	\N
11	vm	강서	7	\N	광고: 상단 바나나 셀링	notok	ok	[수입과일]바나나	농산	\N	\N	2026-03-09 02:37:17.681903	\N
12	vm	강서	7	\N	점수 부여	\N	63	[수입과일]바나나	농산	\N	\N	2026-03-09 02:52:59.1954	\N
13	vm	강서	8	\N	점수 부여	\N	75	[수입과일]바나나	농산	\N	\N	2026-03-09 03:14:58.982138	\N
14	guide	all	\N	\N	[시즌]오렌지	\N	new_guide	[시즌]오렌지	농산	\N	\N	2026-03-09 04:10:21.189312	\N
15	guide	all	\N	\N	[시즌]오렌지	\N	updated_guide	[시즌]오렌지	농산	\N	\N	2026-03-09 04:11:15.216461	\N
16	guide	all	\N	\N	[시즌]오렌지	\N	new_guide	[시즌]오렌지	농산	\N	\N	2026-03-09 04:11:44.287702	\N
17	guide	all	\N	\N	[시즌]오렌지	\N	updated_guide	[시즌]오렌지	농산	\N	\N	2026-03-09 04:11:49.908488	\N
36	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-10 07:20:57.042764	\N
37	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-10 07:20:57.315666	\N
38	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-10 07:30:54.990125	\N
39	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-10 07:31:54.306598	\N
40	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-10 07:31:57.27554	\N
41	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-10 07:32:12.242234	\N
42	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-10 07:32:14.752723	\N
43	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-10 07:32:36.218876	\N
44	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-10 07:32:38.116083	\N
45	guide	all	\N	\N	[계육]	\N	new_guide	[계육]	축산	\N	\N	2026-03-10 07:34:15.915693	\N
46	vm	송파	14	\N	점수 부여	\N	50	[계육]	축산	\N	\N	2026-03-10 07:34:43.414308	\N
47	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-11 01:29:47.50873	\N
48	guide	all	\N	\N	[시즌]오렌지	\N	updated_guide	[시즌]오렌지	농산	\N	\N	2026-03-11 01:29:57.603317	\N
49	guide	all	\N	\N	[시즌]오렌지	\N	updated_guide	[시즌]오렌지	농산	\N	\N	2026-03-11 01:30:08.545513	\N
50	guide	all	\N	\N	[시즌]오렌지	\N	updated_guide	[시즌]오렌지	농산	\N	\N	2026-03-11 01:30:15.194671	\N
51	guide	all	\N	\N	[시즌]오렌지	\N	new_guide	[시즌]오렌지	농산	\N	\N	2026-03-11 01:34:18.233202	\N
52	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-11 01:35:04.00322	\N
53	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-11 01:38:36.899061	\N
54	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-11 01:41:42.733921	\N
55	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-12 03:54:57.213572	\N
56	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-12 07:42:56.535344	\N
57	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-12 07:44:54.979792	\N
58	guide	all	\N	\N	[시즌]오렌지	\N	updated_guide	[시즌]오렌지	농산	\N	\N	2026-03-12 07:45:15.034529	\N
59	guide	all	\N	\N	[시즌]오렌지	\N	updated_guide	[시즌]오렌지	농산	\N	\N	2026-03-12 07:45:40.766528	\N
60	vm	강서	9	\N	점수 부여	\N	100	[시즌]오렌지	농산	\N	\N	2026-03-18 04:34:43.305177	\N
61	guide	all	\N	\N	[수입과일]바나나	\N	updated_guide	[수입과일]바나나	농산	\N	\N	2026-03-18 05:30:28.127476	\N
62	guide	all	\N	\N	[데일리]사과	\N	new_guide	[데일리]사과	농산	\N	\N	2026-03-18 21:40:20.438647	\N
63	guide	all	\N	\N	[건기식]	\N	new_guide	[건기식]	공산	\N	\N	2026-03-19 01:18:01.479942	ad
64	guide	all	\N	\N	[건기식]	\N	updated_guide	[건기식]	공산	\N	\N	2026-03-19 01:18:49.04456	ad
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (sid, sess, expire) FROM stdin;
iijuHnhj3zBVqkiH8uOGRyABgUabHhBL	{"cookie":{"originalMaxAge":604800000,"expires":"2026-04-08T06:27:47.602Z","secure":false,"httpOnly":true,"path":"/"},"isAdmin":true}	2026-04-14 02:59:58
\.


--
-- Name: checklist_replies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.checklist_replies_id_seq', 10, true);


--
-- Name: checklists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.checklists_id_seq', 16, true);


--
-- Name: cleaning_inspections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cleaning_inspections_id_seq', 24, true);


--
-- Name: cleaning_replies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cleaning_replies_id_seq', 13, true);


--
-- Name: guides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.guides_id_seq', 11, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 32, true);


--
-- Name: staff_score_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_score_notifications_id_seq', 64, true);


--
-- Name: checklist_replies checklist_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_replies
    ADD CONSTRAINT checklist_replies_pkey PRIMARY KEY (id);


--
-- Name: checklists checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_pkey PRIMARY KEY (id);


--
-- Name: cleaning_inspections cleaning_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaning_inspections
    ADD CONSTRAINT cleaning_inspections_pkey PRIMARY KEY (id);


--
-- Name: cleaning_replies cleaning_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaning_replies
    ADD CONSTRAINT cleaning_replies_pkey PRIMARY KEY (id);


--
-- Name: guides guides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guides
    ADD CONSTRAINT guides_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: staff_score_notifications staff_score_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_score_notifications
    ADD CONSTRAINT staff_score_notifications_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (sid);


--
-- Name: checklist_replies checklist_replies_checklist_id_checklists_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_replies
    ADD CONSTRAINT checklist_replies_checklist_id_checklists_id_fk FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE;


--
-- Name: cleaning_replies cleaning_replies_cleaning_id_cleaning_inspections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaning_replies
    ADD CONSTRAINT cleaning_replies_cleaning_id_cleaning_inspections_id_fk FOREIGN KEY (cleaning_id) REFERENCES public.cleaning_inspections(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict M3T2KsrFc9FMRw5G5z3NGiiVgdK9DPb1KhzS3xG49GtJfN1jt38PB66YsFnckUx

