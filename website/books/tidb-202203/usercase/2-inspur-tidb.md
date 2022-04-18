# 国产化浪潮下TiDB解决的痛点问题

**作者：h5n1**



# 1   前言

​       随着国内互联网企业的快速发展，传统的oracle数据库架构在成本和扩展性上已不能满足要求，更多的企业将目光转向了开源的MySQL数据库，由于MySQL本身是一个单机数据库其本身并不具备横向扩展能力，于是出现了应用侧的分库分表方案。进一步的又开发出分库分表中间件，由中间件完成分库分表的管理，避免了应用侧的复杂性，分库分表虽然一定程度解决了扩展性的问题，但也存在着其他比较严重的问题，比如：必须指定分库键、分布式事务支持能力差、全表扫描性能影响、在线扩展能力不足等，实际上分库分表更多的只是一个路由功能。

​       NoSQL数据库的出现解决了分库分表的复杂性和扩展性问题，通过将一些简单场景运行在NoSQL数据库(如HBase、MongoDB、Cassandra等)上获得了应用透明和扩展能力的支持。由于NoSQL不支持SQL和事务或支持能力较差，导致很多基于SQL开发的应用无法直接迁移，需要重新开发，同时无法使用SQL的一些功能，也增加开发的复杂度和成本。

​       基于NoSQL数据库的扩展能力优势，又出现了支持SQL的NewSQL分布式数据库，同时支持SQL和分布式事务，并且具有良好的扩展能力，该类数据库更多参考谷歌spanner/ F1等，使用LSM的KV模型，典型的代表有TiDB、CockroachDB、oceanbase等。同时也出现了类似于AWS aurora、Polardb等基于分布式共享存储的方案。

​       为满足实时数仓、统计分析等需求又出现了一种新的数据库形态HTAP(Hybrid Transaction and Analytical Process,混合事务和分析处理)，同时满足OLTP和OLAP业务，典型的代表有TiDB，也有越来越多的国产数据库公司加入HTAP阵营。

​       本文从实际使用和运维管理角度分析TiDB能解决的问题痛点。

# 2   TiDB架构

![image.png](https://tidb-blog.oss-cn-beijing.aliyuncs.com/media/image-1647224583853.png)

**（1）计算节点**

​       TiDB Server：SQL 层，负责接受客户端的连接，执行 SQL 解析和优化，最终生成分布式执行计划。TiDB 层本身是无状态的，实践中可以启动多个 TiDB 实例，通过负载均衡组件（如 LVS、HAProxy 或 F5）对外提供统一的接入地址，客户端的连接可以均匀地分摊在多个 TiDB 实例上以达到负载均衡的效果。

**（2）控制节点**

​       PD (Placement Driver) Server：整个 TiDB 集群的元信息管理模块，负责存储每个 TiKV 节点实时的数据分布情况和集群的整体拓扑结构，提供 TiDB Dashboard 管控界面，并为分布式事务分配事务 ID。PD 不仅存储元信息，同时还会根据 TiKV 节点实时上报的数据分布状态，下发数据调度命令给具体的 TiKV 节点，如热点负载均衡、raft副本创建转移等。此外，PD 本身也是由至少 3 个节点构成，拥有高可用的能力。

**（3）存储节点**

​       TiDB作为HTAP混合负载数据库，同时具有支持高并发OLTP事务的行存TiKV和支持实时数仓的MPP列存TiFlash。

​       (1)  TiKV Server：负责存储数据，从外部看 TiKV 是一个分布式的提供事务的 Key-Value 存储引擎。存储数据的基本单位是 Region，每个 Region 负责存储一个 Key Range的数据，每个 TiKV 节点会负责多个 Region。另外，TiKV 中的数据都会自动维护多副本（默认为三副本，采用raft协议），天然支持高可用和自动故障转移。

​       (2)  TiFlash：通过raft协议实时的同步数据，数据是以列式的形式进行存储，主要的功能是为分析型的场景加速，提供实时数仓能力。

# 3   痛点问题分析

## 3.1 分库分表复杂性

​       分库分表中间件解决了单节点性能问题，提供了一定的扩展性，但具有较大的业务侵入性，其主要问题有：

​       (1)  在设计时需要考虑表的分库键，应用系统需要重新开发。SQL语句中必须带有分库键，否则中间件无法知道请求该发往哪个分库从而对所有分库发起全表扫描，对于支持禁用全表扫描特性的中间件不指定分库键则会报错。

​       (2)  当业务查询时无法知道分库键的情况下部分的解决方式是通过异构索引实现，首先通过异构索引等获取分库键然后再去中间件进行查询，异构索引的维护需要数据同步或者双写方式，可能会带来数据不一致而影响业务。

​       (3)  为减少跨库join，部分小表会设置为广播表或复制表，将join查询下推到分库执行，广播表在分库间的数据需要同步，增加了管理维护复杂性，且数据同步有可能延迟而影响业务。

​       (4)  分库分表中间件对强一致性的分布式事务支持多数采用XA协议，比较依赖底层MySQL的XA支持和容错能力，对底层数据库版本有所要求，如阿里DRDS、MyCat等建议后端MySQL是5.7版本时才使用XA事务。

​       (5)  某个分库存在热点时，无法通过快速迁移方式均衡热点访问，需要重新将数据Hash到新分库后可能才能打散热点。

​       TiDB 作为分布式关系型数据库，由计算节点tidb server提供访问服务，通过负载均衡软件保障对计算节点的均衡访问，用户使用时完全可以看做是一个单节点MySQL数据库，不必关心是否有分库键，还可以在数据库内使用range 、hash、list等分区表。

​       TiDB采用raft多数派协议，强一致性事务模式，默认为3副本，以region(96M)为单位进行管理，一个region就是一段连续的key空间，tikv内每个region包含leader/follower两种角色，默认情况下由leader提供读写请求，leader按照算法均匀分布到所有的存储节点tikv实例上，系统根据region的负载访问情况可以自动进行region的分裂和leader的转移，使各节点负载尽量均衡。Follower节点作为leader的实时副本，可通过follower read、stale read等功能将非苛刻的实时读分散到其他节点，进而降低leader节点的压力提升整体系统处理能力。

![image.png](https://tidb-blog.oss-cn-beijing.aliyuncs.com/media/image-1647224595582.png)![img](file:///C:\Users\unicom\AppData\Local\Temp\msohtmlclip1\01\clip_image004.jpg)

 

## 3.2 在线扩容能力

​       分库分表的模式底层一般使用MySQL主从方式，当需要进行底层分库扩容时，对于已有的历史数据大致需要经历添加新分库、迁移历史数据、数据库切换、历史数据清理等步骤，步骤较为繁琐，切换之前新扩容实例不能提供服务，且当主机上分库达到下限后无法再扩容。

​       TiDB在对存储节点tikv进行扩容时只需一条命令即可完成扩容操作，控制节点会自动的进行region调度以使每个实例的region和Leader均衡，当leader调度到新实例后即可开始服务,可以通过参数设置控制调度速度避免对集群造成影响。

![image.png](https://tidb-blog.oss-cn-beijing.aliyuncs.com/media/image-1647224603419.png)![img](file:///C:\Users\unicom\AppData\Local\Temp\msohtmlclip1\01\clip_image006.jpg)

## 3.3 执行计划管理

   对于MySQL、分库分表中间件当遇到慢SQL时存在以下几个问题：

​       (1)  不能存储SQL执行时的实际执行计划，只能在发现慢SQL后使用explain查看，而查看时的执行计划和执行时可能会不一样。

​       (2)  不能以实际执行的方式查看执行计划（MySQL8.0.18版本开始支持explain analyze方式）

​       (3)  不能对SQL执行计划绑定。

​       TiDB的慢SQL日志内会记录执行计划，通过select tidb_decode_plan()即可查看，同时dashboard内也可以查看慢SQL的执行计划。TiDB4.0版本时推出SPM功能，实现执行计划的绑定，提升了执行计划稳定性。可参考文档https://tidb.io/blog/83b454f1。

![image.png](https://tidb-blog.oss-cn-beijing.aliyuncs.com/media/image-1647224613340.png)![img](file:///C:\Users\unicom\AppData\Local\Temp\msohtmlclip1\01\clip_image008.jpg)

​       从TiDB的执行计划相关功能上看基本实现了类似oracle内的常用操作，执行计划展示也类似于oracle的形式，同时执行计划内还报含了每一步骤的资源消耗和时间统计信息，比较利于判断执行计划的问题点。

## 3.4 DDL变更影响

​       MySQL、Oracle数据库在执行DDL变更时如加列、添加索引等需要持有排他锁，会阻塞其他操作，虽然有online ddl能力，执行期间允许DML操作 ，但在执行开始和结束时仍然要获取排他锁，防止有其他会话同时操作。而且在实际中发现当数据量较大时及时有oneline ddl仍会对其他会话产生锁阻塞。

​       TiDB的表结构在线变更基于 [Google F1 的异步 Schema 变更算法](http://static.googleusercontent.com/media/research.google.com/zh-CN/pubs/archive/41376.pdf)实现，变更是在线的、异步的，并且 Schema 变更过程中所有数据保持可用 ，保持数据一致性，并最大限度减小对性能的影响。DDL变更操作仅更改数据字典，很快便可完成，仅有创建索引时需要回填数据，对于大表执行时间可能较长，可以通过设置并发线程加快速度，但是还是存在着串行执行问题。

## 3.5  混合负载支持

​       HTAP混合分析和事务处理是指一套数据库上既能提供OLTP处理能力又能提供OLAP的分析能力，分库分表方式一般通过数据同步方式将OLTP业务的数据同步到后端的分析型数据库，该架构下除了维护生产库，还需要维护数据同步通道和后端分析型数据库，且在大数据量下存在着一定延迟，不能满足实时数仓要求。

​       TiDB HTAP架构融合OLTP行存和OLAP列存两种模式，通过tikv 提供oltp事务处理，通过tiflash提供OLAP处理，提供MPP能力。 TiDB内数据一致性通过raft实现，tikv中数据副本包含leader和follower角色，由leader实时接收计算节点的数据写入。tiflash 中数据副本为learner角色，只从leader上同步数据，不参与raft投票，不影响tikv内leader选举、迁移等，对OLTP事务处理无影响。

​       OLTP/OLAP访问通过统一的计算节点入口实现，可以使用计算节点的智能选择方式，根据数据量自动选择从tikv还是tiflash读取数据，还可以设置引擎隔离，使计算节点仅访问tiflash，而不影响tikv节点。

​       Oracle 12C版本开始也支持内存列存，，将行数据以列存形式存在内存中，同时具备行存、列存两种模式。MySQL推出了一个列存引擎heatwave用于OLAP的分析场景，作为mysql的第二引擎，目前只能在oracle cloud服务上使用，。

 

## 3.6  冷热存储分离

​       历史数据存储是OLTP型数据库经常面对的问题，从应用设计、数据库功能、存储层都在考虑数据分层存储，实现冷热数据的分离，将比较昂贵的高速存储资源用于频繁的业务，低速的存储资源用于不常访问的业务数据，从而实现既能降低成本又能最大化的提升性能。例如订单类表：1年内的数据访问较为频繁且访问性能要求较高，那么可以把这些数据放到高性能设备上，而历史数据可以放到低性能设备。在应用设计时提前规划好生产表和历史表(可能每年一个历史年表)业务实现，对于oracle数据库需要新分配表空间实现冷热分层(12C版本开始支持生命周期管理，可以实现表和分区级的自动压缩、存储分层)，对于MySQL可能需要新建实例通过数据导入导出实现冷热分层。

​       TiDB 5.3版本开始支持placementrules in SQL(参考https://tidb.io/blog/2dd85a80) ,可在DDL语句中设置库、表、分区级的数据放置规则，通过放置规则可以实现不同表设置不同的副本数、不同表的Leader放到不同的中心、数据的冷热存储分层，放置规则的实现通过存储层的lable参数识别存储节点的数据中心、机房、机架、主机、磁盘类型等，从而实现一个集群内的不同放置规则。比如在两地三中心的场景下(带宽满足的情况下)，可以在同城的2中心放置生产表的leader ，以提供快速的访问，历史数据表可以放到异地的容灾中心，提供实时性要求不苛刻的历史数据访问，从而能充分利用3个中心的资源。

​       除此之外tidb有着较好的数据压缩存储能力，能够节省磁盘空间的占用，根据京东物流的测试使用情况，和MySQL相比压缩比可达3:1。详见链接：https://asktug.com/t/topic/123379



## 3.7 监控指标精细度

​       TiDB集群在部署时会同时部署一套Prometheus和grafana,数据库内包含有很多metrics接口用于监控数整个集群(包含主机)的性能和状态信息，并将这些信息写入到Prometheus里，细化指标达到1000多个，频率基本为30秒/次。告警程序只需从TiDB集群的Prometheus直接查询即可获得监控指标数据，极大的方便了告警程序接入。除了上述功能外TiDB在持续改进系统可观测性，5.4版本开始推出实时展示TOP SQL、ContinuesProfiling功能，这里有点类似oracle的ASH功能.

 ![image.png](https://tidb-blog.oss-cn-beijing.aliyuncs.com/media/image-1647225371433.png)



## 3.8 自主运维能力提升

​       国产数据库官方文档普遍存在着内容简短的问题，相关原理只是粗略介绍，对于使用者来说无法了解到内部原理，需要依靠厂商完成问题处理，不便于自主运维能力提升。

​       TiDB从2015年1.0版本开始开源(目前最新版5.4)，遵循apache2.0开源协议，与其他国产库开源方式不同，tidb自开始便以开源方式在github上提交代码，目前已有很多大厂在使用，建立了良好的社区环境，有较多的经验可供参考（目测有些大厂正是因为看到了tidb开源带来的效应也开始开源自己的产品）。官方文档相较于国内其他数据库写的也相对比较详尽，通过每个版本的release，就可以看出其用心和重视程度，并且博客上也有很多丰富的技术文章，如源码分析系列。对于数据库的了解程度有利于企业的数据库选型、运维延续性和成本降低。

​       据墨天轮数据库排行榜统计TiDB已连续多年成为最流行的国产数据库。

![image.png](https://tidb-blog.oss-cn-beijing.aliyuncs.com/media/image-1647225387416.png)

# 4   总结

​       在国产化的背景下，越来越多的企业放弃oracle而选择国产数据库，大多数最初的策略可能会选择分库分表方式，分库分表后端的MySQL相对来说还是比较成熟稳定，但分库分表带来的成本增加(开发成本、运维成本)、复杂性也逐渐成为企业痛点，TiDB作为新兴的NewSQL分布式关系型数据库，在面对高并发和海量数据场景下，提供了较好的OLTP处理能力和快速的扩缩容能力，很好的解决了分库分表带来的痛点问题。当然确定一款数据库是否适合自己的业务还需要大量测试和实践检验。