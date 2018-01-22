create table delivery_status
( order_id varchar2(10) primary key,
  location varchar2(100),
  status varchar2(100),
  complete_flg char(1),
  delivery_dt varchar2(10),
  delivery_tm varchar2(30));
