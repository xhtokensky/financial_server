
CREATE TABLE `financial_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `avatar` varchar(255) NOT NULL,
  `symbol` varchar(255) NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `admin_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COMMENT='理财分类';


CREATE TABLE `financial_live_user_balance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `symbol` varchar(50) NOT NULL,
  `balance` double(255,8) NOT NULL,
  `push_time` int(11) NOT NULL COMMENT '创建时间  时间戳',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COMMENT='理财活期资产表';


CREATE TABLE `financial_order` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(100) NOT NULL COMMENT '业务号07',
  `user_id` int(11) NOT NULL,
  `symbol` varchar(50) NOT NULL,
  `year_profit` double NOT NULL,
  `quantity` double(255,8) NOT NULL COMMENT '数量',
  `quantity_left` double(255,8) NOT NULL COMMENT '剩余数量',
  `buy_time` bigint(11) NOT NULL DEFAULT '0' COMMENT '购买日期',
  `effective_time` bigint(11) NOT NULL DEFAULT '0' COMMENT '生效时间',
  `maturity_time` bigint(11) NOT NULL COMMENT '到期时间',
  `cycle` int(11) NOT NULL COMMENT '周期',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '1进行中 2已完成 3强平卖出',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `product_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id_index` (`order_id`),
  KEY `user_id_index` (`user_id`),
  KEY `symbol_index` (`symbol`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COMMENT='理财订单表';


CREATE TABLE `financial_order_withdrawal` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL COMMENT '关联 financial_order表中的ID',
  `quantity` double(255,8) NOT NULL COMMENT '取出数量',
  `profit` double(255,8) NOT NULL COMMENT '收益',
  `withdrawal_time` bigint(11) NOT NULL COMMENT '取出时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `year_profit` double(255,8) NOT NULL COMMENT '年化收益率',
  PRIMARY KEY (`id`),
  KEY `order_id_index` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COMMENT='理财订单提前取款记录表';



CREATE TABLE `financial_product` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `financial_category_id` int(11) NOT NULL,
  `category` int(11) NOT NULL DEFAULT '1' COMMENT '1活期 2定期',
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '0带上架 1上架 2下架 ',
  `cycle` int(11) NOT NULL DEFAULT '0' COMMENT '周期  以天为单位',
  `year_profit` double NOT NULL COMMENT '年化收益率',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `admin_id` int(11) NOT NULL,
  `sort` int(11) NOT NULL DEFAULT '1',
  `min_quantity` double(255,8) NOT NULL,
  `title` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fc_id_index` (`financial_category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COMMENT='理财产品配置表';


CREATE TABLE `financial_product_historical_record` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config` int(11) DEFAULT NULL COMMENT '配置表关联id',
  `admin_id` int(11) DEFAULT NULL COMMENT '用户关联Id',
  `new_rate` double(255,8) DEFAULT NULL COMMENT '新利率',
  `old_rate` double(255,8) DEFAULT NULL COMMENT '旧利率',
  `category` int(11) DEFAULT NULL COMMENT '1活期 2定期',
  `msg` varchar(255) CHARACTER SET utf8 DEFAULT NULL COMMENT '描述',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `record_type` set('新增','编辑') CHARACTER SET utf8 DEFAULT NULL COMMENT '类型 1新增 2编辑',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1 COMMENT='配置表历史修改记录';


CREATE TABLE `financial_profit` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL COMMENT '配置Id',
  `relevance_id` int(11) NOT NULL COMMENT '关联id',
  `user_id` int(11) NOT NULL COMMENT '用户id',
  `category` int(11) NOT NULL COMMENT '类型 1活期 2定期',
  `product` enum('live','dead','withdrawal') CHARACTER SET latin1 NOT NULL,
  `symbol` varchar(64) CHARACTER SET utf8 NOT NULL COMMENT '货币类型',
  `balance` double(255,8) NOT NULL COMMENT '发放收益资产基数',
  `year_profit` double(255,8) NOT NULL COMMENT '年化收益',
  `profit` double(255,8) NOT NULL COMMENT '收益',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  `is_date` date DEFAULT NULL COMMENT '收益时间',
  `status` int(11) NOT NULL COMMENT '0收益未发放 1收益已发放',
  `pay_balance` double(255,8) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `re_id_index` (`relevance_id`),
  KEY `user_id_index` (`user_id`),
  KEY `symbol_index` (`symbol`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;








