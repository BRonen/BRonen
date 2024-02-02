---
title: "Thinking about database anomalies"

description: "Some ideas about transactions, locks, isolation levels and anomalies."
created_at: 1699586143462
archived: false
related_posts:
  - thinking_about_database_anomalies
---

# Thinking about database anomalies

When working on relational databases there are some guarantees called [ACID](https://en.wikipedia.org/wiki/ACID), but these guarantees are not really so safe than we usually think.

Let's start with a simple situation, imagine that you have a system that holds a balance of each user in some SQL database.

| user A       | user B      |
| ------------ | ----------- |
| id: 1        | id: 2       |
| balance: 100 | balance: 50 |

If you would like to enable payments to happen between users but keeping the balance of all them positive, how would you implement this? Consider the examples running in a Postgres.

## Implementing payments feature

The naivest solution that I can think is something like these three queries:

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
$stmt = $db->exec("UPDATE user SET balance = balance + :amount WHERE id = :receiverId;");
$stmt->bindParam(":amount", $amount);
$stmt->bindParam(":receiverId", $receiverId);
$stmt->execute();

// decrease the balance of the sender by the same amount
$stmt = $db->exec("UPDATE user SET balance = balance - :amount WHERE id = :senderId;");
$stmt->bindParam(":amount", $amount);
$stmt->bindParam(":senderId", $senderId);
$stmt->execute();
?>
```

## Data racing

This solution seems to work well with a few users, but what happens if two payments of the same sender happens at almost the same time?

<pre class="mermaid">
    sequenceDiagram
    participant C1 as Connection 1
    participant DB as Database
    participant C2 as Connection 2
    C1->>DB: SELECT balance FROM users WHERE id = 1;
    Note over C1,DB: Here the Connection 1 gets the value of 100
    C2->>DB: SELECT balance FROM users WHERE id = 1;
    Note over C2,DB: Here the Connection 2 gets the value of 100
    C1->>DB: UPDATE user SET balance = balance - 100 WHERE id = 1;
    C2->>DB: UPDATE user SET balance = balance - 100 WHERE id = 1;
    C1->>DB: UPDATE user SET balance = balance + 100 WHERE id = 2;
    C2->>DB: UPDATE user SET balance = balance + 100 WHERE id = 2;
    C1->>DB: COMMIT;
    Note over C1,DB: Here the Connection 2 sets the sender balance to 0
    C2->>DB: COMMIT;
    Note over C2,DB: Here the Connection 2 sets the sender balance to -100
</pre>

On the diagram we can see that if we check the balance right before another connection runs the update, the sender balance check that we did gets outdated and then we lose the non negative values guarantee.

One idea that comes in mind to solve this could be doing this operations inside a transaction, so we could run them sequencially due to the atomicity, right?

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

$stmt = $db->exec("UPDATE user SET balance = balance + :amount WHERE id = :receiverId;");
$stmt->bindParam(":amount", $amount);
$stmt->bindParam(":receiverId", $receiverId);
$stmt->execute();

$stmt = $db->exec("UPDATE user SET balance = balance - :amount WHERE id = :senderId;");
$stmt->bindParam(":amount", $amount);
$stmt->bindParam(":senderId", $senderId);
$stmt->execute();

$db->commit();
?>
```

But this snippet has a Write Skew anomaly. Both transactions still runs at same time because the first operation is a Select and by default the transactions doesn't get a lock on the row that they Select, so both will still run at same that and give the same result of the last time. Why it happens if the transactions should be isolated?

## Isolation levels

There are plenty levels of isolation on transactions, the Postgres default is called READ COMMITED. This level means that a transaction can select only the most recent commited version of every row. So if an updated has happened but not committed, the transaction will receive a possible stale version of the rows because of the risk of the another transaction being rollbacked.

In the example, the default isolation doesn't prevents a row of being select by two transactions at same time. But the users can specify another isolation level to get the right garantees that they need like Serializable, in this case the transaction will lock every row selected or updated by the transaction and prevent they of being readed or changed by another transaction at same time.

But what means being locked by a transaction?

## Locking

When the database recognizes some operations that aren't safe to execute at same time, it tries to isolate the transaction running them sequencially. Most of the time the locks are made by the database due to the isolation level, but there are ways to [manually locking](https://www.postgresql.org/docs/current/sql-lock.html) the rows of a transaction.

## Pessimistic locking

## Optimistic locking

---

## References and suggestions

- [https://www.postgresql.org/docs/8.2/transaction-iso.html](https://www.postgresql.org/docs/8.2/transaction-iso.html)
- [https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)
- [https://www.mongodb.com/docs/manual/core/read-isolation-consistency-recency/](https://www.mongodb.com/docs/manual/core/read-isolation-consistency-recency/)
- [https://poorlydefinedbehaviour.github.io/posts/isolation_levels/](https://poorlydefinedbehaviour.github.io/posts/isolation_levels/)
- [https://docs.yugabyte.com/preview/architecture/transactions/isolation-levels/](https://docs.yugabyte.com/preview/architecture/transactions/isolation-levels/)
- [https://www.databass.dev/](https://www.databass.dev/)
- [https://www.postgresql.org/docs/current/explicit-locking.html](https://www.postgresql.org/docs/current/explicit-locking.html)
- [https://www.ibm.com/docs/en/rational-clearquest/7.1.0](https://www.ibm.com/docs/en/rational-clearquest/7.1.0)
