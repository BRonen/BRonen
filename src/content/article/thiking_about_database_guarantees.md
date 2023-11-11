---
title: "Thiking about database guarantees"
description: "Some ideas ledgers, locks and isolation levels"
created_at: 1699586143462
archived: true
---

# Thiking about database guarantees

When working on relational databases there are some guarantees called [ACID](https://en.wikipedia.org/wiki/ACID), but these guarantees are not really so safe than we usually think.

Let's talk about an example situation, imagine that you have a system that holds the account of a group of users in some SQL database. Each user of this group has a numeric value that represent their balance.

If you need to implement a new feature to enable payments to happen between users, how would you implement this? Keep in mind that the solution need to be consistent, balances need some guarantee that will not be a negative value even if more than one connection happens in parallel.

This feature has some pitfalls, there are some solutions to choose, but each solution has its own trade-offs. 

## Implementing payments feature

The naivest solution is only two queries:

```php
<?php
$receiverId = 1;
$senderId = 2;
$amount = 10;

// get the sender balance
$stmt = $db->prepare("SELECT balance FROM users WHERE id = :senderId;");
$stmt->bindParam(":senderId", $senderId);
$stmt->execute();
$stmt->setFetchMode(PDO::FETCH_ASSOC);
$senderUser = $stmt->fetchAll();

// checking if the balance is enough to do the payment
if ($senderUser["balance"] - $amount < 0)
{
    die();
}

$stmt = $db->exec("UPDATE user SET balance = balance + :amount WHERE id = :receiverId;");
$stmt->bindParam(":amount", $amount);
$stmt->bindParam(":receiverId", $receiverId);
$stmt->execute();

$stmt = $db->exec("UPDATE user SET balance = balance - :amount WHERE id = :senderId;");
$stmt->bindParam(":amount", $amount);
$stmt->bindParam(":senderId", $senderId);
$stmt->execute();
?>
```

## Data racing

The last solution seems to work well enough, but what happens if two connections run from the same sender at same time?

<pre class="mermaid">
    sequenceDiagram
    participant C1 as Connection 1
    participant DB as Database
    participant C2 as Connection 2
    C1->>DB: SELECT balance FROM users WHERE id = 1;
    Note over C1,DB: Here the Connection 1 gets the value of 15
    C2->>DB: SELECT balance FROM users WHERE id = 1;
    Note over C2,DB: Here the Connection 2 gets the value of 15
    C1->>DB: UPDATE user SET balance = balance - 10 WHERE id = 1;
    C2->>DB: UPDATE user SET balance = balance - 10 WHERE id = 1;
    C1->>DB: UPDATE user SET balance = balance + 10 WHERE id = 2;
    C2->>DB: UPDATE user SET balance = balance + 10 WHERE id = 2;
    C1->>DB: COMMIT;
    Note over C1,DB: Here the Connection 2 sets the sender balance to 5
    C2->>DB: COMMIT;
    Note over C2,DB: Here the Connection 2 sets the sender balance to -5
</pre>

On the diagram we can see that if we check the balance right before another connection runs the update, the balance check that we did gets outdated and then we lose the non negative values guarantee.

One idea that comes in mind to solve this could be doing this operations inside a transaction, so we could run them in an atomic way, right?

```php
<?php
$db->beginTransaction();

$stmt = $db->prepare("SELECT balance FROM users WHERE id = :senderId;");
$stmt->bindParam(":senderId", $senderId);
$stmt->execute();
$stmt->setFetchMode(PDO::FETCH_ASSOC);
$user = $stmt->fetchAll();

if($user["balance"] - $amount < 0)
{
    $db->rollback();
    return die();
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

But this snippet has a dirty read anomaly. Transactions still runs at same time of another transactions but there are some [isolation levels](https://poorlydefinedbehaviour.github.io/posts/isolation_levels/) to determine how isolated it is.

## Isolation levels

When dealing with atomic transactions, most of the time the database tries to optimize running them in parallel. But how it knows when to run something in parallel or not? It's obvious that it shouldn't run two transactions that mutate the same data at the same data, because it will be a racing condition.

## Locking

## Pessimistic locking

## Optimistic locking

## References

- [https://www.postgresql.org/docs/8.2/transaction-iso.html](https://www.postgresql.org/docs/8.2/transaction-iso.html)
- [https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)
- [https://www.mongodb.com/docs/manual/core/read-isolation-consistency-recency/](https://www.mongodb.com/docs/manual/core/read-isolation-consistency-recency/)
- [https://poorlydefinedbehaviour.github.io/posts/isolation_levels/](https://poorlydefinedbehaviour.github.io/posts/isolation_levels/)
- [https://docs.yugabyte.com/preview/architecture/transactions/isolation-levels/](https://docs.yugabyte.com/preview/architecture/transactions/isolation-levels/)
- [https://www.databass.dev/](https://www.databass.dev/)
