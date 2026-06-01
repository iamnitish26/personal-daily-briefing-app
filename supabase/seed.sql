insert into sources (name, url, kind, category) values
  ('Databricks Release Notes', 'https://docs.databricks.com/aws/en/release-notes/', 'static_url', 'data_engineering'),
  ('Databricks Blog', 'https://www.databricks.com/feed', 'rss', 'data_engineering'),
  ('Apache Airflow Blog', 'https://airflow.apache.org/blog/feed.xml', 'rss', 'data_engineering'),
  ('dbt Blog', 'https://www.getdbt.com/blog/rss.xml', 'rss', 'data_engineering'),
  ('Snowflake Blog', 'https://www.snowflake.com/en/blog/feed/', 'rss', 'data_engineering'),
  ('OpenAI News', 'https://openai.com/news/rss.xml', 'rss', 'ai'),
  ('Anthropic News', 'https://www.anthropic.com/news/rss.xml', 'rss', 'ai'),
  ('Google AI Blog', 'https://blog.google/technology/ai/rss/', 'rss', 'ai'),
  ('HN Databricks Search', 'https://hnrss.org/newest?q=databricks', 'rss', 'community'),
  ('HN AI Agents Search', 'https://hnrss.org/newest?q=ai+agents', 'rss', 'ai')
on conflict (url) do update set
  name = excluded.name,
  kind = excluded.kind,
  category = excluded.category,
  enabled = true;

insert into certification_topics (title, level, domain, order_index) values
  ('Delta Lake ACID Transactions and Table Reliability', 'associate', 'Lakehouse fundamentals', 1),
  ('Managed and External Tables in Unity Catalog', 'associate', 'Data governance', 2),
  ('Medallion Architecture for Batch Pipelines', 'associate', 'Data processing', 3),
  ('Auto Loader and Incremental File Ingestion', 'associate', 'Ingestion', 4),
  ('Databricks Workflows Task Orchestration', 'associate', 'Production pipelines', 5),
  ('Spark SQL Transformations and Joins', 'associate', 'Spark processing', 6),
  ('Delta Live Tables Expectations and Quality Gates', 'associate', 'Pipeline quality', 7),
  ('Unity Catalog Grants, Schemas, and Lineage', 'associate', 'Governance', 8),
  ('Cluster Policies and Job Compute Basics', 'associate', 'Platform operations', 9),
  ('Change Data Capture with Delta Lake', 'associate', 'Incremental processing', 10),
  ('Lakeflow Declarative Pipelines Design', 'professional', 'Advanced pipelines', 1),
  ('Performance Tuning Spark Jobs', 'professional', 'Optimization', 2),
  ('Production Monitoring and Recovery Patterns', 'professional', 'Operations', 3),
  ('Advanced Governance with Unity Catalog', 'professional', 'Governance', 4)
on conflict (level, order_index) do update set
  title = excluded.title,
  domain = excluded.domain,
  enabled = true;
