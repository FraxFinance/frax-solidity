// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title The implementation for a LinkedList
library Linkedlist {
  struct Data {
    int24 previous;
    int24 next;
  }

  /// @dev init data with the lowest and highest value of the LinkedList
  /// @param lowestValue the lowest and also the HEAD of LinkedList
  /// @param highestValue the highest and also the TAIL of the LinkedList
  function init(
    mapping(int24 => Linkedlist.Data) storage self,
    int24 lowestValue,
    int24 highestValue
  ) internal {
    (self[lowestValue].previous, self[lowestValue].next) = (lowestValue, highestValue);
    (self[highestValue].previous, self[highestValue].next) = (lowestValue, highestValue);
  }

  /// @dev Remove a value from the linked list, return the lower value
  ///   Return the lower value after removing, in case removedValue is the lowest/highest, no removing is done
  function remove(mapping(int24 => Linkedlist.Data) storage self, int24 removedValue)
    internal
    returns (int24 lowerValue)
  {
    Data memory removedValueData = self[removedValue];
    require(removedValueData.next != removedValueData.previous, 'remove non-existent value');
    if (removedValueData.previous == removedValue) return removedValue; // remove the lowest value, nothing is done
    lowerValue = removedValueData.previous;
    if (removedValueData.next == removedValue) return lowerValue; // remove the highest value, nothing is done
    self[removedValueData.previous].next = removedValueData.next;
    self[removedValueData.next].previous = removedValueData.previous;
    delete self[removedValue];
  }

  /// @dev Insert a new value to the linked list given its lower value that is inside the linked list
  /// @param newValue the new value to insert, it must not exist in the LinkedList
  /// @param lowerValue the nearest value which is <= newValue and is in the LinkedList
  function insert(
    mapping(int24 => Linkedlist.Data) storage self,
    int24 newValue,
    int24 lowerValue,
    int24 nextValue
  ) internal {
    require(nextValue != self[lowerValue].previous, 'lower value is not initialized');
    require(lowerValue < newValue && nextValue > newValue, 'invalid lower value');
    self[newValue].next = nextValue;
    self[newValue].previous = lowerValue;
    self[nextValue].previous = newValue;
    self[lowerValue].next = newValue;
  }
}
