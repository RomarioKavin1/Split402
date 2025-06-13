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
        string messageId;
        uint256 totalAmount;
        Initiator initiator;
        Member[] members;
    }

    struct SplitView {
        string messageId;
        uint256 totalAmount;
        address initiatorAddress;
        uint256 initiatorAmount;
        bool initiatorPaid;
        address[] memberAddresses;
        uint256[] memberAmounts;
        bool[] memberPaids;
    }

    mapping(bytes32 => mapping(string => Split)) public splits;
    mapping(bytes32 => string[]) private conversationToMessages;

    event SplitCreated(
        bytes32 indexed conversationIdHash,
        string indexed messageId,
        address indexed initiator,
        uint256 totalAmount
    );

    event MemberPaid(bytes32 indexed conversationIdHash, string indexed messageId, address indexed payer);

    function createSplit(
        string calldata conversationId,
        string calldata messageId,
        uint256 totalAmount,
        address initiatorAddress,
        uint256 initiatorAmount,
        address[] calldata memberAddresses,
        uint256[] calldata memberAmounts
    ) external {
        require(memberAddresses.length == memberAmounts.length, "Length mismatch");

        bytes32 cid = keccak256(abi.encodePacked(conversationId));
        Split storage split = splits[cid][messageId];

        require(split.totalAmount == 0, "Split already exists");

        Initiator memory initiator = Initiator({
            initiatorAddress: initiatorAddress,
            amount: initiatorAmount,
            paid: false
        });

        split.messageId = messageId;
        split.totalAmount = totalAmount;
        split.initiator = initiator;

        for (uint256 i = 0; i < memberAddresses.length; i++) {
            split.members.push(Member({
                memberAddress: memberAddresses[i],
                amount: memberAmounts[i],
                paid: false
            }));
        }

        conversationToMessages[cid].push(messageId);
        globalSplitCount++;

        emit SplitCreated(cid, messageId, initiatorAddress, totalAmount);
    }

    function markAsPaid(string calldata conversationId, string calldata messageId, address payer) external {
        bytes32 cid = keccak256(abi.encodePacked(conversationId));
        Split storage s = splits[cid][messageId];

        if (s.initiator.initiatorAddress == payer) {
            s.initiator.paid = true;
            emit MemberPaid(cid, messageId, payer);
            return;
        }

        for (uint256 i = 0; i < s.members.length; i++) {
            if (s.members[i].memberAddress == payer) {
                s.members[i].paid = true;
                emit MemberPaid(cid, messageId, payer);
                return;
            }
        }

        revert("Payer not found in split");
    }

    function getSplitDetails(string calldata conversationId, string calldata messageId)
        external
        view
        returns (
            uint256 totalAmount,
            address initiatorAddress,
            uint256 initiatorAmount,
            bool initiatorPaid,
            address[] memory memberAddresses,
            uint256[] memory memberAmounts,
            bool[] memory memberPaids
        )
    {
        bytes32 cid = keccak256(abi.encodePacked(conversationId));
        Split storage s = splits[cid][messageId];

        totalAmount = s.totalAmount;
        initiatorAddress = s.initiator.initiatorAddress;
        initiatorAmount = s.initiator.amount;
        initiatorPaid = s.initiator.paid;

        uint256 len = s.members.length;
        memberAddresses = new address[](len);
        memberAmounts = new uint256[](len);
        memberPaids = new bool[](len);

        for (uint256 i = 0; i < len; i++) {
            memberAddresses[i] = s.members[i].memberAddress;
            memberAmounts[i] = s.members[i].amount;
            memberPaids[i] = s.members[i].paid;
        }
    }

    function getSplitsByConversationId(string calldata conversationId)
        external
        view
        returns (SplitView[] memory splitsView)
    {
        bytes32 cid = keccak256(abi.encodePacked(conversationId));
        string[] storage ids = conversationToMessages[cid];
        uint256 splitLen = ids.length;

        splitsView = new SplitView[](splitLen);

        for (uint256 i = 0; i < splitLen; i++) {
            Split storage s = splits[cid][ids[i]];
            uint256 memberLen = s.members.length;

            address[] memory mAddresses = new address[](memberLen);
            uint256[] memory mAmounts = new uint256[](memberLen);
            bool[] memory mPaids = new bool[](memberLen);

            for (uint256 j = 0; j < memberLen; j++) {
                mAddresses[j] = s.members[j].memberAddress;
                mAmounts[j] = s.members[j].amount;
                mPaids[j] = s.members[j].paid;
            }

            splitsView[i] = SplitView({
                messageId: s.messageId,
                totalAmount: s.totalAmount,
                initiatorAddress: s.initiator.initiatorAddress,
                initiatorAmount: s.initiator.amount,
                initiatorPaid: s.initiator.paid,
                memberAddresses: mAddresses,
                memberAmounts: mAmounts,
                memberPaids: mPaids
            });
        }
    }
}
