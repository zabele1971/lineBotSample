create user c##bot identified by c##bot default tablespace users container=all;
grant connect, dba to &db_user_name container=all;
alter user &db_user_name quota unlimited on users;
