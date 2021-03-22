package owl

import (
	"context"
	"fmt"

	"github.com/twmb/franz-go/pkg/kerr"
	"github.com/twmb/franz-go/pkg/kmsg"
)

// PartitionReassignments
type PartitionReassignments struct {
	TopicName  string                            `json:"topicName"`
	Partitions []PartitionReassignmentsPartition `json:"partitions"`
}

// PartitionReassignments
type PartitionReassignmentsPartition struct {
	PartitionID      int32   `json:"partitionId"`
	AddingReplicas   []int32 `json:"addingReplicas"`
	RemovingReplicas []int32 `json:"removingReplicas"`
	Replicas         []int32 `json:"replicas"`
}

// ListPartitionReassignments returns all partition reassignments that are currently in progress.
func (s *Service) ListPartitionReassignments(ctx context.Context) ([]PartitionReassignments, error) {
	reassignments, err := s.kafkaSvc.ListPartitionReassignments(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list partition reassignments: %w", err)
	}

	err = kerr.ErrorForCode(reassignments.ErrorCode)
	if err != nil {
		return nil, fmt.Errorf("failed to list partition reassignments. Inner error: %w", err)
	}

	topicReassignments := make([]PartitionReassignments, 0)
	for _, topic := range reassignments.Topics {
		partitionAssignments := make([]PartitionReassignmentsPartition, 0)
		for _, partition := range topic.Partitions {
			partitionAssignments = append(partitionAssignments, PartitionReassignmentsPartition{
				PartitionID:      partition.Partition,
				AddingReplicas:   partition.AddingReplicas,
				RemovingReplicas: partition.RemovingReplicas,
				Replicas:         partition.RemovingReplicas,
			})
		}

		topicReassignments = append(topicReassignments, PartitionReassignments{
			TopicName:  topic.Topic,
			Partitions: partitionAssignments,
		})
	}

	return topicReassignments, nil
}

// PartitionReassignments
type AlterPartitionReassignmentsResponse struct {
	TopicName  string                                         `json:"topicName"`
	Partitions []AlterPartitionReassignmentsPartitionResponse `json:"partitions"`
}

// PartitionReassignments
type AlterPartitionReassignmentsPartitionResponse struct {
	PartitionID  int32   `json:"partitionId"`
	ErrorCode    string  `json:"errorCode"`
	ErrorMessage *string `json:"errorMessage"`
}

// ListPartitionReassignments returns all partition reassignments that are currently in progress.
func (s *Service) AlterPartitionAssignments(ctx context.Context, topics []kmsg.AlterPartitionAssignmentsRequestTopic) ([]AlterPartitionReassignmentsResponse, error) {
	kRes, err := s.kafkaSvc.AlterPartitionAssignments(ctx, topics)
	if err != nil {
		return nil, fmt.Errorf("failed to reassign partitions: %w", err)
	}

	err = kerr.ErrorForCode(kRes.ErrorCode)
	if err != nil {
		return nil, fmt.Errorf("failed to reassign partitions. Inner error: %w", err)
	}

	res := make([]AlterPartitionReassignmentsResponse, len(kRes.Topics))
	for i, topic := range kRes.Topics {
		partitions := make([]AlterPartitionReassignmentsPartitionResponse, len(topic.Partitions))
		for j, partition := range topic.Partitions {

			kErr := kerr.ErrorForCode(partition.ErrorCode)
			var errorStr string
			if kErr != nil {
				errorStr = kErr.Error()
			}

			partitions[j] = AlterPartitionReassignmentsPartitionResponse{
				PartitionID:  partition.Partition,
				ErrorCode:    errorStr,
				ErrorMessage: partition.ErrorMessage,
			}
		}
		res[i] = AlterPartitionReassignmentsResponse{
			TopicName:  topic.Topic,
			Partitions: partitions,
		}
	}

	return res, nil
}
