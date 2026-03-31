--
-- PostgreSQL database dump
--

-- credentials removed

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
-- Name: admin_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_config (
    id integer DEFAULT 1 NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL
);


--
-- Name: company_visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_visitors (
    id text NOT NULL,
    company_name text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    visited_at bigint NOT NULL
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    name text NOT NULL
);


--
-- Name: featured_ad_contact_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.featured_ad_contact_logs (
    id integer NOT NULL,
    featured_ad_id integer NOT NULL,
    visitor_phone character varying(50) DEFAULT ''::character varying NOT NULL,
    owner_phone character varying(50) DEFAULT ''::character varying NOT NULL,
    owner_name character varying(200) DEFAULT ''::character varying NOT NULL,
    contacted_at bigint NOT NULL
);


--
-- Name: featured_ad_contact_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.featured_ad_contact_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: featured_ad_contact_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.featured_ad_contact_logs_id_seq OWNED BY public.featured_ad_contact_logs.id;


--
-- Name: featured_ads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.featured_ads (
    id integer NOT NULL,
    submission_id character varying(100) NOT NULL,
    company_name character varying(200) DEFAULT ''::character varying NOT NULL,
    company_phone character varying(50) DEFAULT ''::character varying NOT NULL,
    plan_days integer NOT NULL,
    plan_label character varying(100) NOT NULL,
    plan_price integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    submitted_at bigint NOT NULL,
    approved_at bigint,
    expires_at bigint,
    contacts_count integer DEFAULT 0 NOT NULL,
    card_num integer
);


--
-- Name: featured_ads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.featured_ads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: featured_ads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.featured_ads_id_seq OWNED BY public.featured_ads.id;


--
-- Name: photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.photos (
    id text NOT NULL,
    card_id text NOT NULL,
    object_path text NOT NULL,
    uploaded_at bigint NOT NULL
);


--
-- Name: saved_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_cards (
    id text NOT NULL,
    saved_at bigint NOT NULL,
    card_num integer DEFAULT 0 NOT NULL,
    region text DEFAULT ''::text NOT NULL,
    owner text DEFAULT ''::text NOT NULL,
    guest_phone text,
    owner_contact text,
    data jsonb NOT NULL,
    employee_id text,
    employee_name text,
    company_name text
);


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    id text NOT NULL,
    submitted_at bigint NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_by text DEFAULT 'guest'::text NOT NULL,
    owner_type text DEFAULT ''::text NOT NULL,
    property_type text DEFAULT ''::text NOT NULL,
    region text DEFAULT ''::text NOT NULL,
    price text DEFAULT ''::text NOT NULL,
    floor text DEFAULT ''::text NOT NULL,
    area text DEFAULT ''::text NOT NULL,
    contact_name text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    owner_contact text,
    card_region text,
    card_data jsonb,
    card_num text,
    employee_id text,
    employee_name text,
    company_name text
);


--
-- Name: visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitors (
    id text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    visited_at bigint NOT NULL
);


--
-- Name: featured_ad_contact_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_ad_contact_logs ALTER COLUMN id SET DEFAULT nextval('public.featured_ad_contact_logs_id_seq'::regclass);


--
-- Name: featured_ads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_ads ALTER COLUMN id SET DEFAULT nextval('public.featured_ads_id_seq'::regclass);


--
-- Data for Name: admin_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_config (id, username, password_hash) FROM stdin;
1	Yousef	896ef932e614506f17d8e82282d3ef69:5739e86b9e05dc214ac59785c77f8e0399a5eece71ecf710a53918c9a02596fdf9766a2a2f956425c76d9a2fa334f5c994ba70a7d5fad06a9970abb80c927a2b
\.


--
-- Data for Name: company_visitors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_visitors (id, company_name, phone, visited_at) FROM stdin;
co_0798561011	يوسف للاسكان	0798561011	1774828844685
co_0790027330	D	0790027330	1774848769900
co_0799609280	شركة هديل	0799609280	1774873489467
co_0797017117	السليتي	0797017117	1774960665647
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, username, password, name) FROM stdin;
1774739561723	1	7f120e07e788092c9f5a3ac8ca8e11a5:213295f461cd7282af45450d5a45f7def8348747da238df1283a5c2b41196857e0f88a31f41fd5b698955983e3148ec8d59fafc327c83ff270bade0c00c3da12	هديل
\.


--
-- Data for Name: featured_ad_contact_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.featured_ad_contact_logs (id, featured_ad_id, visitor_phone, owner_phone, owner_name, contacted_at) FROM stdin;
\.


--
-- Data for Name: featured_ads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.featured_ads (id, submission_id, company_name, company_phone, plan_days, plan_label, plan_price, status, submitted_at, approved_at, expires_at, contacts_count, card_num) FROM stdin;
\.


--
-- Data for Name: photos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.photos (id, card_id, object_path, uploaded_at) FROM stdin;
1774742197870_89bdgfpxqqb	sub_1774742165821	/objects/uploads/96d9c2f0-42cc-43f0-8706-1929bb43406a	1774742197870
1774742199365_xc8k182w70h	sub_1774742165821	/objects/uploads/d4400dec-4d65-4ad5-ab6e-9bb1773d3ba8	1774742199365
1774742200698_7w1ue5clv7	sub_1774742165821	/objects/uploads/bbb14443-d7f6-4528-89a8-bb61a4864452	1774742200698
1774742202061_a21a41dy51t	sub_1774742165821	/objects/uploads/cfd890dd-a3c9-462b-8f78-5c55b65bcbb1	1774742202061
1774742203400_f07g1vnul7a	sub_1774742165821	/objects/uploads/5fc9c9ac-972e-4295-9394-7b21202deaa1	1774742203400
1774742204688_mf2k9anh1t	sub_1774742165821	/objects/uploads/900bdd40-634f-4299-99f7-b6493a8aa339	1774742204688
1774742206043_dhyw35wwoe	sub_1774742165821	/objects/uploads/12c78d8e-135f-450d-987b-024ad7f91933	1774742206043
1774742207301_94lf7tengee	sub_1774742165821	/objects/uploads/5a1e81d9-6134-454a-be64-00a3e3602599	1774742207301
1774742208535_0rcdznhjeem	sub_1774742165821	/objects/uploads/903fa178-4f8d-482b-ab3e-53a4412f88e2	1774742208535
1774742209770_fuew14j3lfh	sub_1774742165821	/objects/uploads/6a3ba766-e609-45c0-b5c3-aa53b0e25443	1774742209770
1774742383901_1uy8lhsdtft	sub_1774742364737	/objects/uploads/dd3e779d-be30-431e-b93a-ec4cd9d354ef	1774742383901
1774742385311_1c5qtw6g2s	sub_1774742364737	/objects/uploads/22f018ca-49ec-40fc-be7d-47b5256f4f16	1774742385311
1774742386626_mabvic0ia2c	sub_1774742364737	/objects/uploads/0ebd5957-188e-4a77-bd68-5830aac0c0c1	1774742386626
1774742495541_g03o31clt2	sub_1774742475242_i7dtp18ebvp	/objects/uploads/1e13abb9-ed03-476d-96ae-6e411bc41076	1774742495541
1774742496840_g8y9k9bjc2	sub_1774742475242_i7dtp18ebvp	/objects/uploads/7c1234ed-7648-48ff-a2cd-21bcf35e97bb	1774742496840
1774742498078_o2fjf4f5kpa	sub_1774742475242_i7dtp18ebvp	/objects/uploads/3747ef47-dfb9-4ef4-9d20-740e0b1161a2	1774742498078
1774743164833_o2bpptqko2	sub_1774743145254	/objects/uploads/936fe57e-366c-4047-985c-42344335ecce	1774743164833
1774743166105_6p48l0lrsyn	sub_1774743145254	/objects/uploads/fd691433-fe1a-45b2-8f21-bb5da2c27c51	1774743166105
1774743167481_esgsb1kwgi6	sub_1774743145254	/objects/uploads/4cd6be97-c393-4c67-a28c-3d22cf61319a	1774743167481
1774743168751_pgp9yjzahg	sub_1774743145254	/objects/uploads/a2070179-ae36-4fb9-98e4-b6ee80ae1973	1774743168751
1774743170052_p7op9zxo6mf	sub_1774743145254	/objects/uploads/9f8f081c-17ae-4987-ad38-dacc5bf638c5	1774743170052
1774743195191_rptu3uyb7kg	sub_1774743180970	/objects/uploads/b04de6b8-00f4-4fc5-838d-c972bfc8bed5	1774743195191
1774743196507_dwavx791rzf	sub_1774743180970	/objects/uploads/7f7c5212-6f18-4a66-8664-3f9280e73db6	1774743196507
1774743197779_yqea7c8vp6h	sub_1774743180970	/objects/uploads/fe7e26be-8bc1-4385-b9a7-cfcab57202ee	1774743197779
1774743232220_ot6umoern1	sub_1774743210656_bv5e5all4dm	/objects/uploads/904347e7-3962-4cf2-9a7b-dd97de586c67	1774743232220
1774743233598_9wzet9wbk7q	sub_1774743210656_bv5e5all4dm	/objects/uploads/95d5c58d-6fd8-4bf7-9831-8eb3c2581668	1774743233598
1774743234863_j003wyoxez	sub_1774743210656_bv5e5all4dm	/objects/uploads/b2172447-0ac1-4b82-9975-e7dfe2fdd074	1774743234863
1774743236584_uklw7jtwv39	sub_1774743210656_bv5e5all4dm	/objects/uploads/dac4db05-f261-4a0a-a9ad-9476f98efb21	1774743236584
1774743237864_d12e9065ub5	sub_1774743210656_bv5e5all4dm	/objects/uploads/0e7b8d20-7697-436b-8691-d62ccc149ddc	1774743237864
1774743239105_2b2sycp8dno	sub_1774743210656_bv5e5all4dm	/objects/uploads/06a0dca6-158f-40c9-820a-e4751aa99fb5	1774743239105
1774743241070_ge8dlqpnbto	sub_1774743210656_bv5e5all4dm	/objects/uploads/467d354e-bffa-4880-90a9-2da55a9e64f0	1774743241070
1774743242364_y2jhzl4cbft	sub_1774743210656_bv5e5all4dm	/objects/uploads/3450c0e2-65cf-4edd-9da1-e7da0aee8c2c	1774743242364
1774743243574_43xay4spgng	sub_1774743210656_bv5e5all4dm	/objects/uploads/9cdfc71e-d6e9-4eeb-801d-cd3084231a6a	1774743243574
1774743244937_v1rxq41okhd	sub_1774743210656_bv5e5all4dm	/objects/uploads/f37ab42e-f057-4393-a298-dfbdfb6fb4d3	1774743244937
1774743835063_vetz6zquev	sub_1774743810654	/objects/uploads/cf5d63c3-eea4-4716-8581-cbffc82fbce8	1774743835063
1774743836404_gxyrp8pew6q	sub_1774743810654	/objects/uploads/bcc7beb8-89c8-4b8b-9da6-a9a2f750be6b	1774743836404
1774743837748_tmzexkjxsb	sub_1774743810654	/objects/uploads/418f777a-858d-467c-8dab-fac8e99336a3	1774743837748
1774743839015_j8525bwnmik	sub_1774743810654	/objects/uploads/829b1622-325a-4742-884c-2938f32d43fb	1774743839015
1774743926106_9smta2ck5w7	sub_1774743900944	/objects/uploads/bea473f1-13a5-44fe-898f-2f48c45ec86f	1774743926106
1774743927445_dnk096zwmjq	sub_1774743900944	/objects/uploads/d9bac352-1be3-40c1-be30-4adfd8bdb119	1774743927445
1774743928748_ps2qpl9lc4	sub_1774743900944	/objects/uploads/74a9918d-a4ae-4e86-9864-60c8561f81f8	1774743928748
1774743930045_ixvzzzi97o	sub_1774743900944	/objects/uploads/a81c7256-19f7-4a57-bdf0-9ce0ccc9d333	1774743930045
1774743962358_qv6rvm098zd	sub_1774743943902_draz2bhdrg7	/objects/uploads/3ed6cd93-37be-4752-80f7-baf862762ec2	1774743962358
1774743963652_6cwilz3zrxi	sub_1774743943902_draz2bhdrg7	/objects/uploads/b9fd70fe-eabf-4977-95a1-d98ade25d394	1774743963652
1774743964946_up816xn7jnh	sub_1774743943902_draz2bhdrg7	/objects/uploads/df4d37df-408e-45cc-91fd-d21e51e2e0d5	1774743964946
1774743966213_3mbfoblh8su	sub_1774743943902_draz2bhdrg7	/objects/uploads/cb6bf4d1-9d14-40ba-a092-d789f033b51b	1774743966213
1774743967537_8oea1cwp6qa	sub_1774743943902_draz2bhdrg7	/objects/uploads/ec8171dd-7186-44a6-ab28-5395e3b83a63	1774743967537
1774743968847_hw17o910id7	sub_1774743943902_draz2bhdrg7	/objects/uploads/d1beaafb-4c35-4917-9744-26d6b583f934	1774743968847
1774743970099_sfbnq7v6gu9	sub_1774743943902_draz2bhdrg7	/objects/uploads/720f1baa-a786-4035-b885-fb0bda66dd69	1774743970099
1774743971365_guh6nnzlsqi	sub_1774743943902_draz2bhdrg7	/objects/uploads/ecc1f72c-de09-4141-aaa7-e0d88ba7e120	1774743971365
1774743972595_071ifva1bj6h	sub_1774743943902_draz2bhdrg7	/objects/uploads/91711927-1920-4331-b2b6-529363451555	1774743972595
1774743973826_vwgq24r2zih	sub_1774743943902_draz2bhdrg7	/objects/uploads/1263b7e5-3585-4f5f-8ba0-26320009d7ec	1774743973826
1774744417935_6uzp774c1uo	sub_1774744396761	/objects/uploads/ad2cd737-c260-49fe-8b24-bf7bd7ef2871	1774744417935
1774744419898_olqglnpi8vi	sub_1774744396761	/objects/uploads/02232fa0-090e-4fb0-b597-a808b1cd80c4	1774744419898
1774744421209_dycjp0g0h6	sub_1774744396761	/objects/uploads/984b3876-35bb-47c9-a18e-ff317c4a4b98	1774744421209
1774744422552_jwioemcxed	sub_1774744396761	/objects/uploads/89f4c205-0055-4cc9-9a7b-c541518e248d	1774744422552
1774744424386_6cb5vor5kmj	sub_1774744396761	/objects/uploads/c670e2d8-9d1a-4e89-bff4-d5ad6dd7bf75	1774744424386
1774744425686_fl5ktf7glho	sub_1774744396761	/objects/uploads/ed2df29b-fc3f-4bd8-a29a-6eb64c8cd23a	1774744425686
1774744426997_v7r052t0bg	sub_1774744396761	/objects/uploads/ab1010ac-4c70-486e-9df4-ca2bbf09a8ef	1774744426997
1774744428314_631tb7d9kd3	sub_1774744396761	/objects/uploads/67e7bf59-c641-4f41-98c9-cf396c29b67b	1774744428314
1774744466988_ielyuhtzq09	sub_1774744446577_wvnr1yltw7s	/objects/uploads/fa9d5d23-f279-4c8a-bb3e-3da80afce5e3	1774744466988
1774744468555_fp071f09aak	sub_1774744446577_wvnr1yltw7s	/objects/uploads/516ab240-41a8-4aa9-933c-d60de592b3c7	1774744468555
1774744469851_rc58l8zaywl	sub_1774744446577_wvnr1yltw7s	/objects/uploads/b3972de4-43e7-4f93-8761-0a5404333789	1774744469851
1774744471156_ygmzqv6eyfa	sub_1774744446577_wvnr1yltw7s	/objects/uploads/15e67fc9-3119-4964-bae4-3e0eda62b68d	1774744471156
1774744472432_90qqdmr6jmk	sub_1774744446577_wvnr1yltw7s	/objects/uploads/81c8a338-060f-49dc-9e16-3a0f927385d3	1774744472432
1774744473705_osmldsthe4g	sub_1774744446577_wvnr1yltw7s	/objects/uploads/e303290d-9c64-418f-897f-cb9e75a920a2	1774744473705
1774745280452_owjtd47318t	sub_1774745258008_wnz153052hq	/objects/uploads/a24297bd-b257-4c59-8b0a-6dced321396f	1774745280452
1774745281898_q6d1f9js6	sub_1774745258008_wnz153052hq	/objects/uploads/f67f606b-e493-41df-95f6-d2143a4bcd07	1774745281898
1774745283170_bn7988x7uk	sub_1774745258008_wnz153052hq	/objects/uploads/66ef06e6-988b-4068-af71-50ac084bf1b4	1774745283170
1774745284455_70wq95bgzmc	sub_1774745258008_wnz153052hq	/objects/uploads/0ca5a08a-1fae-40e3-b5f6-7c8adfdbc2f4	1774745284455
1774745285719_0kg5rro8i1zr	sub_1774745258008_wnz153052hq	/objects/uploads/383f6188-a11e-4e85-808d-0490343b5e95	1774745285719
1774745286958_el8qmjz2sn	sub_1774745258008_wnz153052hq	/objects/uploads/aa8ff321-3b7a-441f-81b4-3a027b65b976	1774745286958
1774745788395_0vm8p2fhl76	sub_1774745778779_k4f0tauejke	/objects/uploads/7b74d39a-d265-44d0-8ac0-a32ba7fb0236	1774745788395
1774745790193_p8bpw13cjgh	sub_1774745778779_k4f0tauejke	/objects/uploads/89dbd59c-3a7d-462e-b599-bebce7f00d3c	1774745790193
1774745791515_rpy00evmkr	sub_1774745778779_k4f0tauejke	/objects/uploads/74fd2642-7066-4bca-8b1d-0f46b4c5ef2e	1774745791515
1774745792785_mxez3mk2gbe	sub_1774745778779_k4f0tauejke	/objects/uploads/9de61af3-a962-476b-80d4-68265e9bb2c7	1774745792785
1774745794150_xnqy5kbwu9e	sub_1774745778779_k4f0tauejke	/objects/uploads/adc829b8-c61e-4877-9a1a-e847094a61c1	1774745794150
1774745795407_g3rgwl4nyt5	sub_1774745778779_k4f0tauejke	/objects/uploads/3ee42c40-90c4-442d-882e-56a6bb12eb2b	1774745795407
1774746180828_hbwhr8fx6lo	sub_1774746169580_6dablk232gg	/objects/uploads/bad49856-8462-4ba3-b20b-4ed5dc8181f9	1774746180828
1774746183423_nbwv3h2m0kd	sub_1774746169580_6dablk232gg	/objects/uploads/01637195-66a0-4481-9e01-9a7390330d10	1774746183423
1774746184994_0iurmqp89gs8	sub_1774746169580_6dablk232gg	/objects/uploads/c2571257-6b56-42cc-a3a4-99e615855b6d	1774746184994
1774746186695_37dhzge6mky	sub_1774746169580_6dablk232gg	/objects/uploads/1d5ffc24-adf8-43c9-88c8-8bf7e46709e2	1774746186695
1774746187975_b83dqvblkjo	sub_1774746169580_6dablk232gg	/objects/uploads/0cd111e5-4f26-4ca8-acb3-02f341f5f6ff	1774746187975
1774746189276_6nezgcc43ix	sub_1774746169580_6dablk232gg	/objects/uploads/a484ff55-60bf-4ce9-a2f4-a6b9d10f15f4	1774746189276
1774746356355_youi6y5j5s	sub_1774746337236_87tp3t59kfv	/objects/uploads/53583fbe-024b-41ef-9877-d78786a80faf	1774746356355
1774746358169_llmlqbjwzi	sub_1774746337236_87tp3t59kfv	/objects/uploads/915a83f1-3084-4c25-b432-cd26e7040b4d	1774746358169
1774746362158_0r0mkpihudo	sub_1774746337236_87tp3t59kfv	/objects/uploads/f3a7ec72-8080-4d3f-ab90-a8a8ec6bc7f6	1774746362158
1774746363712_7uvtu07r2mm	sub_1774746337236_87tp3t59kfv	/objects/uploads/5e301589-7157-4f45-92ae-6cddf211d11b	1774746363712
1774746365564_qtc1d6ibktm	sub_1774746337236_87tp3t59kfv	/objects/uploads/113f9212-eecf-4222-8880-1ed219c6a541	1774746365564
1774746366837_kbdcvvnwyrh	sub_1774746337236_87tp3t59kfv	/objects/uploads/b00cb37b-abf6-4b64-8384-30b50ab7a0c2	1774746366837
1774746777918_qaodat6cyi	sub_1774746758584_07rgdgvmceep	/objects/uploads/80c18314-fbbc-4782-ad4b-2b3a429aff83	1774746777918
1774746779578_ni6al6ns9x9	sub_1774746758584_07rgdgvmceep	/objects/uploads/c070061b-fd8b-45f8-a00c-1e788de1ee7f	1774746779578
1774746782036_4gse8bjq3mf	sub_1774746758584_07rgdgvmceep	/objects/uploads/fa678baa-6aa6-475e-9e46-935f21ca8452	1774746782036
1774746783835_omnhv3op45e	sub_1774746758584_07rgdgvmceep	/objects/uploads/f4899622-ae77-4427-8205-b354fcf50561	1774746783835
1774746785139_kx7ntjt69z	sub_1774746758584_07rgdgvmceep	/objects/uploads/51fc7f2b-fafe-4fd0-a2cf-1962d392eb10	1774746785139
1774747161789_if4v9nkodfi	sub_1774747144090_39cv4sgczp2	/objects/uploads/a6c3963c-d9c2-458d-a462-ea0159323773	1774747161789
1774747163538_twmqp0yl3s	sub_1774747144090_39cv4sgczp2	/objects/uploads/8c3d89ae-73da-413c-8eb8-b6a238285c0b	1774747163538
1774747165929_89lhagbg3fy	sub_1774747144090_39cv4sgczp2	/objects/uploads/0a178e5c-4ca5-4d96-b17b-a1cd63a5fb41	1774747165929
1774747168226_in286z33iz9	sub_1774747144090_39cv4sgczp2	/objects/uploads/61c3a3aa-0996-4cce-8da3-0d5cf66580ec	1774747168226
1774747169881_53i8k2igxy	sub_1774747144090_39cv4sgczp2	/objects/uploads/b5ee2f7b-5307-4d1c-a4c3-7f0d079bde5c	1774747169881
1774747171169_lbb18ivbwq	sub_1774747144090_39cv4sgczp2	/objects/uploads/8a51ed26-7137-4eda-a529-3879cb36513e	1774747171169
1774747172430_c21t8rirqyb	sub_1774747144090_39cv4sgczp2	/objects/uploads/a15abf79-aa67-4f5c-ab88-629e59e1cad9	1774747172430
1774747173702_u0r06j3iej	sub_1774747144090_39cv4sgczp2	/objects/uploads/992abdfb-4cfc-49d6-b43d-f522ca66ae5f	1774747173702
1774747174967_gr0wgae5gq	sub_1774747144090_39cv4sgczp2	/objects/uploads/5bc9df37-f597-47b2-9397-c7ca574355ac	1774747174967
1774747176250_2dk1llx1px8	sub_1774747144090_39cv4sgczp2	/objects/uploads/90a2e091-21ab-40ea-87ae-0d91633934ba	1774747176250
1774747470187_k7mw6r3fd7o	sub_1774747446573_bh0u6r84r7o	/objects/uploads/1c5d5117-3802-425f-8ea1-00548ef0e6b0	1774747470187
1774747472488_tzbbitgc1v	sub_1774747446573_bh0u6r84r7o	/objects/uploads/058ae8c9-ece1-436f-b540-db0b0329fab5	1774747472488
1774747474236_twq3l9cop9	sub_1774747446573_bh0u6r84r7o	/objects/uploads/4338a343-d787-47bb-adab-03332dde4e02	1774747474236
1774747477011_1uxig0as3k5	sub_1774747446573_bh0u6r84r7o	/objects/uploads/55ba8d6c-ba0d-4de1-8f81-d2d122083d8d	1774747477011
1774747479127_9i2rxzmxmuw	sub_1774747446573_bh0u6r84r7o	/objects/uploads/3739eeef-6f39-4ca4-9f40-0bd37f28bd30	1774747479127
1774747480439_dg33eyoludn	sub_1774747446573_bh0u6r84r7o	/objects/uploads/f2299882-e228-4b4f-a0e1-35d5f52a4c7f	1774747480439
1774747481721_9xm9m14sbe9	sub_1774747446573_bh0u6r84r7o	/objects/uploads/78709d90-4439-428b-b4ab-c446a379d1b3	1774747481721
1774747483052_rc7omgtahw	sub_1774747446573_bh0u6r84r7o	/objects/uploads/f3866e71-cc09-4326-b09d-f9f0727faac7	1774747483052
1774747484757_6186v3c04z3	sub_1774747446573_bh0u6r84r7o	/objects/uploads/9d0ede76-1329-4547-872b-cada5f73558a	1774747484757
1774747485973_mkxtybpcij	sub_1774747446573_bh0u6r84r7o	/objects/uploads/dd8d2a10-7a33-4dd8-8e02-9c5acf453c10	1774747485973
1774747968394_8we6vcmp0lx	sub_1774747955777_asjo06hluvj	/objects/uploads/53b85ced-27f1-48f2-88ae-a10558a7b2d3	1774747968394
1774747970637_msv0iweg7er	sub_1774747955777_asjo06hluvj	/objects/uploads/c44fb4ea-88ab-4689-a0e3-5fd94a496615	1774747970637
1774747972333_qa14vec33w9	sub_1774747955777_asjo06hluvj	/objects/uploads/195d2266-c21e-48a8-9820-917b5ea4a89c	1774747972333
1774747975010_9rycxnix3yc	sub_1774747955777_asjo06hluvj	/objects/uploads/0e64e5e7-c922-4c29-8d5b-ae4cdce57604	1774747975010
1774747976591_g5gog9rmzbr	sub_1774747955777_asjo06hluvj	/objects/uploads/aaa2051c-cff8-46e1-8621-4683462d9c50	1774747976591
1774747978319_6mnhgpf9zor	sub_1774747955777_asjo06hluvj	/objects/uploads/92cf19ca-7499-4e84-9f37-c84e0dd31432	1774747978319
1774747979671_3fx2e0tckuj	sub_1774747955777_asjo06hluvj	/objects/uploads/b1135710-9e20-4349-8f30-3f2a858c87c6	1774747979671
1774747980991_l6iybzk8e0m	sub_1774747955777_asjo06hluvj	/objects/uploads/16e30195-6f9e-43d7-bd64-d44216995a82	1774747980991
1774814680562_akrv8nc2mlq	sub_1774814655803	/objects/uploads/d8d98bb3-69d1-494d-a50b-8923fb7bf69a	1774814680562
1774814795721_j8sxzg4dnlm	sub_1774814763351_4r8yi4dp3bp	/objects/uploads/3700040d-395d-423e-8ebb-fb18085238ca	1774814795721
1774814798302_mddj42ynpx8	sub_1774814763351_4r8yi4dp3bp	/objects/uploads/2d2e4a7e-87e1-49fc-b3ac-e48d27e5d7cf	1774814798302
1774814801009_3ah4kvjepn6	sub_1774814763351_4r8yi4dp3bp	/objects/uploads/65735ec6-66af-4747-ac8c-31de3760ef03	1774814801009
1774821122623_gwl5nfifkf4	sub_1774821101925	/objects/uploads/2981ca98-6310-4f7b-b384-e378b08f55a3	1774821122623
1774821124738_dcehk8aj5rm	sub_1774821101925	/objects/uploads/9d3b0e39-f28a-492d-b2c4-293d5cf0b6bf	1774821124738
1774821203763_uj8p6xqv08r	sub_1774821183839	/objects/uploads/a0cd1d59-3537-42f2-907c-95c2301725f4	1774821203763
1774821205813_hcxn2y5cflt	sub_1774821183839	/objects/uploads/c7408297-e3c1-450d-bdd1-b623ad89b87d	1774821205813
1774821535489_2hg3oryuc7e	sub_1774821500831_nbwvuy11w6j	/objects/uploads/4515a615-920b-4fcf-b834-ea07aab0c257	1774821535489
1774821537588_jlm16tkzi78	sub_1774821500831_nbwvuy11w6j	/objects/uploads/71bb45da-d10b-439c-8e01-7d946b8e2c7a	1774821537588
1774822590179_6ji0s1atjt7	sub_1774822568053	/objects/uploads/b216bd41-aa31-40f5-8944-4f0ce1a06f4b	1774822590179
1774822592102_tcrwt5zdkk	sub_1774822568053	/objects/uploads/0b738efe-0149-4886-a2ce-6a05b5b51e26	1774822592102
1774822594119_ck3xzpwgy7h	sub_1774822568053	/objects/uploads/5c69838b-d673-45c2-acf3-713e292d63bc	1774822594119
1774822596907_hpyd3yknfi4	sub_1774822568053	/objects/uploads/61b12e0e-0a4e-483a-9b91-6cf6769716af	1774822596907
1774824112129_9knh24afaie	sub_1774824090496	/objects/uploads/30958883-d7de-4d6b-91d7-eb5528ed921d	1774824112129
1774824114312_j32dhrw4wuk	sub_1774824090496	/objects/uploads/4a7f027f-3112-43ce-b8bc-0207175bc474	1774824114312
1774824117770_cgfdst27w64	sub_1774824090496	/objects/uploads/9b66ff06-71a9-4d89-b6a2-3cc5c6713573	1774824117770
1774824129219_uoq50hg80jp	sub_1774824090496	/objects/uploads/8e7ac69d-c618-4eae-a738-cae2cc9e4aff	1774824129219
1774824203378_ax3yky0vrjp	sub_1774824154280_4eksidrkd8w	/objects/uploads/018e7e82-30fc-4d29-8ab6-ccbb828a3f2c	1774824203378
1774824205427_z0yggob8jfr	sub_1774824154280_4eksidrkd8w	/objects/uploads/c611e114-147f-4694-916a-d2770629c60a	1774824205427
1774824207871_814g4phzsb	sub_1774824154280_4eksidrkd8w	/objects/uploads/552c364f-b243-4a71-a097-fb5047e9a257	1774824207871
1774824210314_hzd3f43jdpm	sub_1774824154280_4eksidrkd8w	/objects/uploads/8b7feaec-df51-4bd6-8120-31cb7f8e4ca5	1774824210314
1774825606001_vk28ce72m9p	sub_1774825573457	/objects/uploads/c9df89fc-eb24-43f7-8c9f-126a9309619e	1774825606001
1774825608445_frtlzmefcvn	sub_1774825573457	/objects/uploads/93555c08-2728-4f1d-8eb5-5cc57a6af0fa	1774825608445
1774826079840_8nn39zscpbg	sub_1774825999800_3h0ozq0rktu	/objects/uploads/2bcd01bd-84a3-4e5f-bc14-a4636e2fa1c4	1774826079840
1774826081739_s9fdfxsvyvl	sub_1774825999800_3h0ozq0rktu	/objects/uploads/fd0df53c-8552-40a7-892a-4eda7744be03	1774826081739
1774826084008_d2swx2sqk2u	sub_1774825999800_3h0ozq0rktu	/objects/uploads/9d978a98-0558-4a30-a6a8-2b62653f55c7	1774826084008
1774826086038_jfltnom25ef	sub_1774825999800_3h0ozq0rktu	/objects/uploads/44b0ad63-629c-4375-b274-1fe8e89ffc57	1774826086038
1774827116466_y6hxdrxecd8	sub_1774827057373_vjnyv0nmym	/objects/uploads/7b9cfa9c-9799-4c5a-ba4f-59950b57a057	1774827116466
1774827118454_3waekasyxfi	sub_1774827057373_vjnyv0nmym	/objects/uploads/5b96236d-2c95-451f-849d-baf73b92ef10	1774827118454
1774828951927_ap6rvglonkl	sub_co_1774828844549	/objects/uploads/4b49bd39-a796-4229-82eb-e9e4ea85a716	1774828951927
1774828953937_ktqj59lyob	sub_co_1774828844549	/objects/uploads/bd0561ef-a60c-46df-a9e4-3e71cb312e39	1774828953937
1774828956050_f2s5c8ajy4u	sub_co_1774828844549	/objects/uploads/6661462f-d8b9-4816-863f-16a3ebb895a0	1774828956050
1774828958659_fxx1f8fvemf	sub_co_1774828844549	/objects/uploads/05b3c9b7-e21e-494c-ae2e-7f0352b86326	1774828958659
1774830360596_mqw1qp9r3wk	sub_co_1774830267889	/objects/uploads/7c836822-d9fa-4b46-8d08-66b688a8635d	1774830360596
1774830362916_dfhh8i9vsr5	sub_co_1774830267889	/objects/uploads/658948cf-d148-4767-af6d-1c644f01cb22	1774830362916
1774830365704_lfdumunwcw	sub_co_1774830267889	/objects/uploads/e77f0b90-1a99-469d-8937-65f574ddb60e	1774830365704
1774830368227_3t1spa524b4	sub_co_1774830267889	/objects/uploads/81daf9c3-8f4d-4773-a6b3-469d0778c7ec	1774830368227
1774830370061_g9thhvm1qpf	sub_co_1774830267889	/objects/uploads/cf85993d-26ba-46ce-a209-549b8f5afc78	1774830370061
1774830371991_uq9ues05at	sub_co_1774830267889	/objects/uploads/8f8a0673-637f-43c6-970a-41f14986a002	1774830371991
1774831609486_1g6de9n7ctu	sub_1774831559317_lidhwbczvc9	/objects/uploads/a2bc017a-4fa9-450d-92ef-ed2e034c3f1d	1774831609486
1774831611465_y9l4sop1u4	sub_1774831559317_lidhwbczvc9	/objects/uploads/941cfbae-5435-47fa-a8b6-2edaf1c835b9	1774831611465
1774842514834_7rejut5y11j	sub_1774842491952	/objects/uploads/47bc9308-d652-4e10-b185-5f1a81b2197d	1774842514834
1774842517666_tsuo9n7vst	sub_1774842491952	/objects/uploads/5483af4f-691f-4c77-9763-91b1cd54d5f5	1774842517666
1774842705193_q496vclc	sub_co_1774842647394	/objects/uploads/38bd2aab-b0e5-452e-a579-a2aa8da6f1a6	1774842705193
1774842707625_xoso301zlra	sub_co_1774842647394	/objects/uploads/b26a9976-1f45-45e0-9e58-ca0c912eab5e	1774842707625
1774842710224_vnffvmurqph	sub_co_1774842647394	/objects/uploads/e6459335-5448-4aec-b1da-d929b6b897c3	1774842710224
1774842713153_zoiwtf19w8	sub_co_1774842647394	/objects/uploads/411f008c-2025-4e55-bda1-850602fe3f35	1774842713153
1774842716319_enrmjkxaygr	sub_co_1774842647394	/objects/uploads/3dec6053-e84a-4f46-879a-4e445d7bbb0b	1774842716319
1774842719765_hvv9qswef1a	sub_co_1774842647394	/objects/uploads/337e9ff4-a973-4848-9045-b351b218be54	1774842719765
1774842790479_m4chr19x1yd	sub_co_1774842739621	/objects/uploads/3511aab0-e8ca-4e80-8e25-d83219b70cc9	1774842790479
1774842792311_qqjynyarq9	sub_co_1774842739621	/objects/uploads/72d8ed2a-71e6-483a-a2e8-84e36ae706c7	1774842792312
1774842794148_2iu9toa1dj5	sub_co_1774842739621	/objects/uploads/8403ce7d-4fef-4a9c-aa40-f1053147919d	1774842794148
1774842795790_jq94fbc5tgs	sub_co_1774842739621	/objects/uploads/6c539903-c883-4078-a9ec-4bc7633464f8	1774842795790
1774842797369_z4z74rfytdl	sub_co_1774842739621	/objects/uploads/be3b9a2d-8d49-40d2-b8d7-0115a9d35bb4	1774842797369
1774842853232_p7ftl2j9iz	sub_1774842821839_yrfmfdo904d	/objects/uploads/b05f9ee6-af58-4cc7-8a1d-1187a11a6b88	1774842853232
1774842856147_ehpynf3zpaq	sub_1774842821839_yrfmfdo904d	/objects/uploads/ea069933-0cd2-4971-b8a0-b0dbef54228d	1774842856147
1774842858513_mbibkirq5yb	sub_1774842821839_yrfmfdo904d	/objects/uploads/6571d4f6-f44b-4448-9655-e76f397d2127	1774842858513
1774842861025_zfkucny38zl	sub_1774842821839_yrfmfdo904d	/objects/uploads/5e894376-db72-4e60-9cb9-cf1f58fef99e	1774842861025
1774842863615_m07mzrx00fi	sub_1774842821839_yrfmfdo904d	/objects/uploads/4d6b6e36-4949-4017-8641-fdc880dd2695	1774842863615
1774842866739_2zmpm7crntl	sub_1774842821839_yrfmfdo904d	/objects/uploads/d21c41a3-b813-4bdd-a06a-a6b9cc57b5b1	1774842866739
1774843066923_u5r8r7nw14o	sub_co_1774843028893	/objects/uploads/c8a0ba2e-8dda-4035-a3d8-6e479254defe	1774843066923
1774843069429_o5znddc7a6f	sub_co_1774843028893	/objects/uploads/e9eb68f6-c4a6-4ba6-b878-411c38b97e87	1774843069429
1774843071969_uh0j9loueap	sub_co_1774843028893	/objects/uploads/362360d8-5b00-45ef-921f-e6cb4e348c95	1774843071969
1774843074732_xfm8aafwn48	sub_co_1774843028893	/objects/uploads/4efe89c6-c45a-4315-af66-bbac3d23ad68	1774843074732
1774843077642_8ova4wjw3o3	sub_co_1774843028893	/objects/uploads/7ec07e5d-dd4d-4ad6-8f9d-375c32b2b890	1774843077642
1774843081730_3oecadrk01v	sub_co_1774843028893	/objects/uploads/9646cf0a-8f4c-44f8-be00-d2318a4e6d4d	1774843081730
1774844554672_strfepajogk	sub_1774844526109	/objects/uploads/c075cb4c-e27b-4bba-bf53-9bc27f74b75e	1774844554672
1774844557040_9x5mcatbrvo	sub_1774844526109	/objects/uploads/f7d2686d-c370-49b5-b40b-3c21f43b051f	1774844557040
1774844558763_0hvqugmp9g9d	sub_1774844526109	/objects/uploads/47987f22-ba07-4c8a-8ba9-5a54656e5e4a	1774844558763
1774844660241_d6bgcdcqy2f	sub_co_1774844600879	/objects/uploads/b4eea7f5-07f3-4009-b323-a416400c9451	1774844660241
1774844662695_ndyk3zo3bya	sub_co_1774844600879	/objects/uploads/40e2d2ed-ab9d-4ecb-87bb-2881c2426017	1774844662695
1774844665086_vs041iqc89c	sub_co_1774844600879	/objects/uploads/d2bd3ba3-4c49-4110-b931-287ae4f98d99	1774844665086
1774844667811_rp9q1gmtxc9	sub_co_1774844600879	/objects/uploads/0aa4269a-98f8-4890-a6c8-01848fd5a00f	1774844667811
1774844670481_vqrkrmd29wo	sub_co_1774844600879	/objects/uploads/0a91b321-23c7-48b5-834f-d97868147f27	1774844670481
1774844674029_cu1ao3sy61l	sub_co_1774844600879	/objects/uploads/2fc8bb87-3dc7-4363-8c5d-191ad75d7fb5	1774844674029
1774844676676_asure3z1x3u	sub_co_1774844600879	/objects/uploads/b98fe3ab-2894-45c4-83d9-65c4f9b5fd13	1774844676676
1774844754343_yujs6ow4ush	sub_co_1774844678975	/objects/uploads/2471beb5-0a65-4b90-9ddd-3fca73b48bc6	1774844754343
1774844757559_ttuyktpy3c	sub_co_1774844678975	/objects/uploads/21b44c8e-33bf-4217-9d06-1e33f0965d9b	1774844757559
1774848648698_5ka3whpaunj	sub_1774848620227	/objects/uploads/7fc6eab8-b6da-480e-a263-83ee503c7a70	1774848648698
1774848651017_u042oj1286	sub_1774848620227	/objects/uploads/a5132c41-72f9-4fcc-a88f-2db4fe2d1158	1774848651017
1774848758674_viep7m5c4o	sub_co_1774848672902	/objects/uploads/729041c8-67cd-4436-ae1e-37bff196e807	1774848758674
1774848761958_75i0sv8o6yd	sub_co_1774848672902	/objects/uploads/c5c8110e-89b5-4150-b570-c994fc55e218	1774848761958
1774848764062_7h07ztp9vq9	sub_co_1774848672902	/objects/uploads/06bca6b5-3933-4e0a-8322-14b3d50fc320	1774848764062
1774848765748_bpfu3hjfzrb	sub_co_1774848672902	/objects/uploads/fe45739b-b2ac-4b11-81de-802d2bd42f40	1774848765748
1774848767983_jwhlw9xouf	sub_co_1774848672902	/objects/uploads/1914e9df-0ad2-4435-8f23-ce6b9c37a913	1774848767983
1774848816509_wm2sml4o9g	sub_co_1774848766592	/objects/uploads/0335bc5a-90ce-4728-9f8e-9775de3dd359	1774848816509
1774848818189_rtecb5c62jj	sub_co_1774848766592	/objects/uploads/caaf083d-e690-4d4b-b055-b412063d6456	1774848818189
1774848820660_vylrtmcbdzr	sub_co_1774848766592	/objects/uploads/7f4f212f-6458-47cc-b5ba-e91966068549	1774848820660
1774848823775_aisnzcl93no	sub_co_1774848766592	/objects/uploads/021b3c93-4c05-4941-8d9c-e7e856bcaa91	1774848823775
1774848907940_pmlqmcuduj	sub_1774848864950_sl1w9ue4p5r	/objects/uploads/fee7e222-8dd3-4bcc-8c10-1b5c5d6bf272	1774848907940
1774848910241_0stj4eh9mewq	sub_1774848864950_sl1w9ue4p5r	/objects/uploads/af95d434-b2d2-454e-a358-0906aa072d01	1774848910241
1774848912986_owkzk9fyco	sub_1774848864950_sl1w9ue4p5r	/objects/uploads/e85da0c6-88fe-4a86-b7ed-c74225536fe5	1774848912986
1774848917283_8zpr3c96k35	sub_1774848864950_sl1w9ue4p5r	/objects/uploads/fdab84e7-ab22-4ab0-85f6-644b50430285	1774848917283
1774848968505_gep4mvqdmnt	sub_co_1774848769762	/objects/uploads/fc242c7e-f148-49dc-8ff7-5c6b39957528	1774848968505
1774848971158_rcgrj12lu3f	sub_co_1774848769762	/objects/uploads/ecc61261-600d-4b78-80d1-b2045292e484	1774848971158
1774849028505_awhntzms5ht	sub_1774848994889_c1fl2zij75d	/objects/uploads/317f0071-42ac-477c-a2cd-2a0dc73be24c	1774849028505
1774849087085_o6suo4xbyp9	sub_co_1774849060201	/objects/uploads/1d764d8a-df6b-4a15-bd1a-c1f436020c5d	1774849087085
1774849088612_a1d8cno9c88	sub_co_1774849060201	/objects/uploads/007990f6-ab07-402d-a860-c9d26e8dcc54	1774849088612
1774849420152_6ti4fhxjqb4	sub_1774849404840	/objects/uploads/b773f64d-c165-4f82-b166-44db3aa48811	1774849420152
1774849421952_c7i4nt1qvn	sub_1774849404840	/objects/uploads/bf4e8061-3808-4385-9582-5024c264b1ce	1774849421952
1774873008842_uo81qnrwktc	sub_1774872971003_v06p2m0beso	/objects/uploads/bd9a09d7-263d-41e8-a39e-6ae6e160a708	1774873008842
1774881145828_7qodk8luhab	sub_co_1774881076014	/objects/uploads/e95c4ce7-103c-432e-8bad-6852d8062602	1774881145828
1774881147083_ve1pi2e1bef	sub_co_1774881076014	/objects/uploads/0f288b0a-b68f-44a1-8cfd-9e0edfcc8796	1774881147083
1774881148486_rgq9oryhvlh	sub_co_1774881076014	/objects/uploads/2e06bde5-dbbb-4752-a26c-9ef639bbb329	1774881148486
1774884581119_anekbfouzcq	sub_co_1774884499984	/objects/uploads/1d462ee5-86ed-406a-8f4e-49859ee0b471	1774884581119
1774884583091_vzfmc8yyq8l	sub_co_1774884499984	/objects/uploads/b37570eb-97bc-401d-bfe1-9f671369382f	1774884583091
1774885767611_i6cgb1zptj9	sub_1774885710457	/objects/uploads/fc67a2bf-a762-459f-a72c-5600199cfe2e	1774885767611
1774885769893_rjgvcqcfzrr	sub_1774885710457	/objects/uploads/5f9ca5ef-88c0-4ba4-a13c-61c7d6a67889	1774885769893
1774885772530_shab72t366	sub_1774885710457	/objects/uploads/60c723b4-6729-4699-935e-237561913d4c	1774885772530
1774885848463_mku5hama2oa	sub_1774885783352	/objects/uploads/500e4c4f-060f-4cc9-8030-ae9dde63d9df	1774885848463
1774885985782_m0820b1tlj9	sub_co_1774885914791	/objects/uploads/ab949b11-42f6-4321-bcdb-65af7d446e3d	1774885985782
1774885987872_akdghvwz1d9	sub_co_1774885914791	/objects/uploads/c2cd2491-8819-442f-87cf-05e98355d757	1774885987872
1774885990378_as9j24xuij6	sub_co_1774885914791	/objects/uploads/b759b949-43c7-44e0-b518-f0bc77eaa257	1774885990378
1774885992615_6b5yhkk8ymq	sub_co_1774885914791	/objects/uploads/2b130a5e-6fca-4dff-9886-e37627e72d57	1774885992615
1774885994372_10jgw5yeeho	sub_co_1774885914791	/objects/uploads/9d35859d-a400-4123-b1db-c87f17cef1f4	1774885994372
1774885996177_el458h0hodb	sub_co_1774885914791	/objects/uploads/d01d3461-d202-4bbc-a151-7b660db1ac10	1774885996177
1774885998540_r9dimp2efw	sub_co_1774885914791	/objects/uploads/e89a5fc2-8c30-4355-a56c-cb88cb1046f7	1774885998540
1774886000983_ge8n4vl5jlw	sub_co_1774885914791	/objects/uploads/138d6c0e-e4a3-49ca-9bbb-8a9a526427fe	1774886000983
1774886002856_4mn0p59bd1i	sub_co_1774885914791	/objects/uploads/620f38e7-9b93-4ebf-805e-8af4e985d760	1774886002857
1774886005006_pjqtsl5wsh	sub_co_1774885914791	/objects/uploads/8eec87f6-b5e3-4684-a080-bfa7da32e9ed	1774886005006
1774886009939_7ya97fnazme	sub_co_1774885917989	/objects/uploads/0b98b936-d4aa-4259-ab19-95d263b31445	1774886009939
1774886011679_agw9obvgbp	sub_co_1774885917989	/objects/uploads/e6e1f671-033c-4774-a96b-cf72737fdb46	1774886011679
1774886013625_cnysxjajfq	sub_co_1774885917989	/objects/uploads/b983c8ee-8218-49dd-bc12-32a379e49f73	1774886013625
1774886082607_dh7ap33as8h	sub_co_1774886008104	/objects/uploads/fb3c7cae-76aa-4d78-bd98-51486f89d499	1774886082607
1774886084942_xrk60e5p72a	sub_co_1774886008104	/objects/uploads/3af665fe-58b9-48f4-ac6a-c90f46353b0e	1774886084942
1774886086982_8n297c25rso	sub_co_1774886008104	/objects/uploads/5278b56b-3262-43dc-aba5-a723a1c0df05	1774886086982
1774886093061_n2f34ntko2m	sub_co_1774886008104	/objects/uploads/8d6c148f-0206-4963-b5a5-77146e9ecf60	1774886093061
1774886155153_7eumeczm9co	sub_co_1774886041632	/objects/uploads/b6222e57-37df-406a-bca2-746859ef6eac	1774886155153
1774886156983_e6n2lxk3fyp	sub_co_1774886041632	/objects/uploads/09b6b1ce-063e-4d0a-89e1-ed8a0c7497bc	1774886156983
1774886305263_aipqed4mx4	sub_co_1774886239703	/objects/uploads/fa7d19f9-8943-45a4-ac84-acbd709d64ee	1774886305263
1774886308027_wuaqr6moaga	sub_co_1774886239703	/objects/uploads/646f47ef-8931-49ca-9246-873a94419f39	1774886308027
1774886389851_l2xlzwuk4f	sub_co_1774886309817	/objects/uploads/f0c0a705-6ce7-420c-a159-0ab5cc7a0f51	1774886389851
1774886508936_8h3i0p5wk9a	sub_1774886421984_oqlz2ha3vwc	/objects/uploads/9816fe78-5010-4b18-bf1b-01a4f4eae9e0	1774886508936
1774886510918_q6lf16wctb	sub_1774886421984_oqlz2ha3vwc	/objects/uploads/28d3b1c7-53b7-44b4-9b98-9deceb26ecbd	1774886510918
\.


--
-- Data for Name: saved_cards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.saved_cards (id, saved_at, card_num, region, owner, guest_phone, owner_contact, data, employee_id, employee_name, company_name) FROM stdin;
sub_1774908684377	1774908776221	1	مرج الحمام	جغلة	0782429209	\N	{"note1": "", "note2": "مع شركة شقق وأراضي المستقبل نقدم لكم أفضل العروض والأسعار ؛ بأعلى مستويات الجودة في التشطيب السوبر ديلوكس", "phone": "0798561011", "floors": [{"id": 1, "area": "٥٠٠ م²", "name": "أرض", "price": "١٠٩٠٠٠"}], "subtitle": "للاستثمار العقاري المتميز", "companyName": "شقق وأراضي المستقبل", "description": "شارعين", "projectName": "أرض — مرج الحمام"}	\N	\N	\N
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.submissions (id, submitted_at, status, submitted_by, owner_type, property_type, region, price, floor, area, contact_name, phone, description, owner_contact, card_region, card_data, card_num, employee_id, employee_name, company_name) FROM stdin;
1774908684377	1774908754004	approved	guest	شخصي	أرض	مرج الحمام	١٠٩٠٠٠		٥٠٠	جغلة	0782429209	شارعين	\N	\N	\N	1	\N	\N	\N
\.


--
-- Data for Name: visitors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.visitors (id, name, phone, visited_at) FROM stdin;
v_0798561011	يوسف	0798561011	1774830936484
v_0790027330	D	0790027330	1774848329405
v_0799609280	هديل	0799609280	1774872853591
v_12345674890	احمد	12345674890	1774959730544
v_5848542653	Test	5848542653	1774960776086
\.


--
-- Name: featured_ad_contact_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.featured_ad_contact_logs_id_seq', 4, true);


--
-- Name: featured_ads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.featured_ads_id_seq', 80, true);


--
-- Name: admin_config admin_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_config
    ADD CONSTRAINT admin_config_pkey PRIMARY KEY (id);


--
-- Name: company_visitors company_visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_visitors
    ADD CONSTRAINT company_visitors_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: employees employees_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_username_unique UNIQUE (username);


--
-- Name: featured_ad_contact_logs featured_ad_contact_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_ad_contact_logs
    ADD CONSTRAINT featured_ad_contact_logs_pkey PRIMARY KEY (id);


--
-- Name: featured_ads featured_ads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_ads
    ADD CONSTRAINT featured_ads_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: saved_cards saved_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_cards
    ADD CONSTRAINT saved_cards_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: visitors visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict SwdXy5ojlCans9ynsg2R30KvMIJq3XP9Wiu9yG3OTv51KIzArbI27bTL3xUHtBB

