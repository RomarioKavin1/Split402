// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PaymentSplitterRegistry {
    uint256 public globalSplitCount;

    struct Member {
        address memberAddress;
        uint256 amount;
        bool paid;
    }

    struct Initiator {
        address initiatorAddress;
        uint256 amount;
        bool paid;
    }

    struct Split {
        uint256 totalAmount;
        Initiator initiator;
        Member[] members;
    }

    mapping(bytes32 => Split) public splits;

    event SplitCreated(bytes32 indexed splitId, address indexed initiator, uint256 totalAmount);
    event MemberPaid(bytes32 indexed splitId, address indexed member);

    function createSplit(
        uint256 totalAmount,
        address initiatorAddress,
        uint256 initiatorAmount,
        address[] calldata memberAddresses,
        uint256[] calldata memberAmounts
    ) external returns (bytes32) {
        require(memberAddresses.length == memberAmounts.length, "Length mismatch");

        // Generate unique ID using initiator and current global count
        bytes32 splitId = keccak256(abi.encodePacked(initiatorAddress, globalSplitCount));
        globalSplitCount++;

        Initiator memory initiator = Initiator({
            initiatorAddress: initiatorAddress,
            amount: initiatorAmount,
            paid: false
        });

        Split storage split = splits[splitId];
        split.totalAmount = totalAmount;
        split.initiator = initiator;
        delete split.members;
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            split.members.push(Member({
                memberAddress: memberAddresses[i],
                amount: memberAmounts[i],
                paid: false
            }));
        }

        emit SplitCreated(splitId, initiatorAddress, totalAmount);
        return splitId;
    }

    function getSplitDetails(bytes32 splitId)
        external
        view
        returns (
            uint256 totalAmount,
            address initiatorAddress,
            uint256 initiatorAmount,
            bool initiatorPaid,
            address[] memory memberAddresses,
            uint256[] memory memberAmounts,
            bool[] memory memberPaid
        )
    {
        Split storage s = splits[splitId];

        totalAmount = s.totalAmount;
        initiatorAddress = s.initiator.initiatorAddress;
        initiatorAmount = s.initiator.amount;
        initiatorPaid = s.initiator.paid;

        uint256 len = s.members.length;
        memberAddresses = new address[](len);
        memberAmounts = new uint256[](len);
        memberPaid = new bool[](len);

        for (uint256 i = 0; i < len; i++) {
            memberAddresses[i] = s.members[i].memberAddress;
            memberAmounts[i] = s.members[i].amount;
            memberPaid[i] = s.members[i].paid;
        }
    }

    function markAsPaid(bytes32 splitId, address payer) external {
        Split storage s = splits[splitId];

        if (s.initiator.initiatorAddress == payer) {
            s.initiator.paid = true;
            emit MemberPaid(splitId, payer);
            return;
        }

        for (uint256 i = 0; i < s.members.length; i++) {
            if (s.members[i].memberAddress == payer) {
                s.members[i].paid = true;
                emit MemberPaid(splitId, payer);
                return;
            }
        }

        revert("Payer not found in split");
    }
}
