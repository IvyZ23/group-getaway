---
timestamp: 'Mon Oct 13 2025 01:54:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_015443.ddc9e715.md]]'
content_id: 063fbd6ecf34de28682dae355e0145a37204ad7fb6f69505aaccc9314363c736
---

# test: CostSplitting

Please include one test that is operational: A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example. Also include a test case for each of these scenarios:

* Attempt to remove non-existing expense (should fail)
* Item is paid for (users have input enough for the item) (should mark item as covered)
* Same user adds another contribution (should add to previous)
* Same user updates contribution (not creating another contribution) (should replace old contribution)
* User updates contribution to 0 (should remove contribution)
* User updates contribution to negatve numbers (should not be allowed)
* Multiple users can make contributions to one item

Please split these into separate tests. Do not group them all together in one.
