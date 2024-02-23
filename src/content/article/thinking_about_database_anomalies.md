---
title: "Thinking About Database Anomalies"
description: "Some ideas about transactions, locks, isolation levels and anomalies."
created_at: 1699586143462
archived: false
related_posts:
  - thinking_about_database_anomalies
---

# Thinking About Database Anomalies

When working on relational databases there are some guarantees called [ACID](https://en.wikipedia.org/wiki/ACID), but these guarantees are not as safe as we usually think.

Let's start with a simple situation, imagine that you have a system that holds a balance of each user in some SQL database.

| user A       | user B      |
| ------------ | ----------- |
| id: 1        | id: 2       |
| balance: 100 | balance: 50 |

If you would like to enable payments to happen between users but keep the balance of all of them positive, how would you implement this? Consider the examples running in a Postgres.

## Implementing Payments Feature

The most naive solution that I can think of is something like these three queries:

```php
<?php
// consider the table of previous section
$receiverId = 1;
$senderId = 2;
$amount = 100;

// get the sender balance
$stmt = $db->prepare("SELECT balance FROM users WHERE id = :senderId;");
$stmt->bindParam(":senderId", $senderId);
$stmt->execute();
$senderUser = $stmt->fetch();

// checking if the balance is enough to do the payment
if ($senderUser["balance"] - $amount < 0) {
    return;
}

// increase the balance of the receiver with the amount
$stmt = $db->exec("UPDATE users SET balance = balance + :amount WHERE id = :receiverId;");
$stmt->bindParam(":amount", $amount);
$stmt->bindParam(":receiverId", $receiverId);
$stmt->execute();

// decrease the balance of the sender by the same amount
$stmt = $db->exec("UPDATE users SET balance = balance - :amount WHERE id = :senderId;");
$stmt->bindParam(":amount", $amount);
$stmt->bindParam(":senderId", $senderId);
$stmt->execute();
?>
```

## Data Racing

This solution seems to work well with a few users, but what happens if two payments of the same sender happen at almost the same time?

<pre class="mermaid">
    sequenceDiagram
    participant C1 as Connection 1
    participant DB as Database
    participant C2 as Connection 2
    C1->>DB: SELECT balance FROM users WHERE id = 1;
    Note over C1, DB: Here Connection 1 gets a value of 100
    C2->>DB: SELECT balance FROM users WHERE id = 1;
    Note over C2, DB: Here Connection 2 gets a value of 100
    C1->>DB: UPDATE user SET balance = balance - 100 WHERE id = 1;
    C2->>DB: UPDATE user SET balance = balance - 100 WHERE id = 1;
    C1->>DB: UPDATE user SET balance = balance + 100 WHERE id = 2;
    C2->>DB: UPDATE user SET balance = balance + 100 WHERE id = 2;
    C1->>DB: COMMIT;
    Note over C1, DB: Here Connection 2 sets the sender balance to 0
    C2->>DB: COMMIT;
    Note over C2, DB: Here Connection 2 sets the sender balance to -100
</pre>

On the diagram, we can see that if we check the balance right before another connection runs the update, the sender balance check that we did gets outdated and then we lose the non-negative values guarantee.

One idea that comes to mind to solve this could be doing these operations inside a transaction, so we could run them sequentially due to the isolation, right?

```php
<?php
$db->beginTransaction();

$stmt = $db->prepare("SELECT balance FROM users WHERE id = :senderId;");
$stmt->bindParam(":senderId", $senderId);
$stmt->execute();
$user = $stmt->fetchAll();

if($user["balance"] - $amount < 0)
{
    $db->rollback();
    return;
}

$stmt = $db->exec("UPDATE users SET balance = balance + :amount WHERE id = :receiverId;");
$stmt->bindParam(":amount", $amount);
$stmt->bindParam(":receiverId", $receiverId);
$stmt->execute();

$stmt = $db->exec("UPDATE users SET balance = balance - :amount WHERE id = :senderId;");
$stmt->bindParam(":amount", $amount);
$stmt->bindParam(":senderId", $senderId);
$stmt->execute();

$db->commit();
?>
```

But this snippet has a Write Skew anomaly. Both transactions still run at the same time because the first operation is a Select and by default, the transactions don't get a lock on the row that they Select, so both will still run at the same time and give the same result as the last time. Why did it happen if the transactions were supposed to be isolated?

## Isolation Levels

There are plenty of levels of isolation on transactions, the Postgres default is called READ COMMITTED. This level means that a transaction can select only the most recent committed version of every row. So if an update has happened but is not committed, the transaction will receive a possible stale version of the rows because of the risk of another transaction being rollbacked.

In the example, the default isolation doesn't prevent a row from being selected by two transactions at the same time. But the users can specify another isolation level to get the right guarantees that they need like Serializable. In this case, the transaction will lock every row selected or updated by the transaction and prevent them from being read or changed by another transaction at the same time.

But what mean to be locked by a transaction?

## Locking

When the database recognizes some operations that aren't safe to execute in parallel, it keeps a lock on the resource and the lock prevents running another transaction that needs this resource until the first is completed and the lock is released.

Most of the time the locks are automatically made by the database based on the isolation level, but there are ways to [manually lock](https://www.postgresql.org/docs/current/sql-lock.html) the rows of a transaction.

## Pessimistic Locking

> Two-phase locking is a so-called pessimistic concurrency control mechanism: it is based on the principle that if anything might possibly go wrong (as indicated by a lock held by another transaction), it’s better to wait until the situation is safe again before doing anything. It is like mutual exclusion, which is used to protect data structures in multi-threaded programming.
>
> Serial execution is, in a sense, pessimistic to the extreme: it is essentially equivalent to each transaction having an exclusive lock on the entire database (or one partition of the database) for the duration of the transaction. (...)

This paragraph was taken from a book called "[Designing Data-Intensive Applications](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/)". The strategy of preventing errors from happening using this type of lock is called a pessimistic solution, but this isn't the only type of solution.

## Optimistic Locking

> By contrast, serializable snapshot isolation is an optimistic concurrency control technique. Optimistic in this context means that instead of blocking if something potentially dangerous happens, transactions continue anyway, in the hope that everything will turn out all right. When a transaction wants to commit, the database checks whether anything bad happened (i.e., whether isolation was violated); if so, the transaction is aborted and has to be retried. Only transactions that executed serializably are allowed to commit.
>
> (...) It performs badly if there is high contention (many transactions trying to access the same objects), as this leads to a high proportion of transactions needing to abort. If the system is already close to its maximum throughput, the additional transaction load from retried transactions can make performance worse.
>
> However, if there is enough spare capacity, and if contention between transactions is not too high, optimistic concurrency control techniques tend to perform better than pessimistic ones. (...)

But one consideration that we need to have is that if the application doesn't receive conflicting requests so often, then locking everything to always block another transaction to use the same data is quite a waste of performance just to handle some possible rare cases. In this situation, there is a better option to handle these cases.

## Check Constraint

If you already know some SQL, maybe you already reached a better solution to this situation without using locks. One resource that most of the databases have is the [Check Constraint](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS), this constraint defines that some column needs to satisfy a boolean expression.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT,
    balance NUMERIC CHECK (balance > 0)
);
```

---

## References and suggestions

- [https://www.postgresql.org/docs/8.2/transaction-iso.html](https://www.postgresql.org/docs/8.2/transaction-iso.html)
- [https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)
- [https://poorlydefinedbehaviour.github.io/posts/isolation_levels/](https://poorlydefinedbehaviour.github.io/posts/isolation_levels/)
- [https://docs.yugabyte.com/preview/architecture/transactions/isolation-levels/](https://docs.yugabyte.com/preview/architecture/transactions/isolation-levels/)
- [https://www.databass.dev/](https://www.databass.dev/)
- [https://www.postgresql.org/docs/current/explicit-locking.html](https://www.postgresql.org/docs/current/explicit-locking.html)
- [https://www.ibm.com/docs/en/rational-clearquest/7.1.0](https://www.ibm.com/docs/en/rational-clearquest/7.1.0)
- [https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/)
- [https://www.postgresql.org/docs/current/sql-lock.html](https://www.postgresql.org/docs/current/sql-lock.html)
- [https://www.postgresql.org/docs/current/ddl-constraints.html](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [https://on-systems.tech/blog/128-preventing-read-committed-sql-concurrency-errors/](https://on-systems.tech/blog/128-preventing-read-committed-sql-concurrency-errors/)
