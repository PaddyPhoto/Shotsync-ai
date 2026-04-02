/**
 * Step 4: Create cluster records in the database
 */
import { createServiceClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import type { ClusterAssignment } from './step3-clustering'

export async function createClusterRecords(
  jobId: string,
  assignments: ClusterAssignment[]
): Promise<Map<number, string>> {
  const supabase = createServiceClient()

  // Get unique cluster IDs from assignments
  const clusterNums = Array.from(new Set(assignments.map((a) => a.clusterId)))
  const clusterIdMap = new Map<number, string>()

  // Create one cluster record per group
  for (const clusterNum of clusterNums) {
    const clusterMembers = assignments.filter((a) => a.clusterId === clusterNum)
    const clusterId = uuidv4()

    const { error } = await supabase.from('clusters').insert({
      id: clusterId,
      job_id: jobId,
      image_count: clusterMembers.length,
      status: 'pending',
    })

    if (error) throw new Error(`Failed to create cluster: ${error.message}`)
    clusterIdMap.set(clusterNum, clusterId)
  }

  // Batch update image cluster assignments
  for (const [clusterNum, clusterId] of clusterIdMap) {
    const imageIds = assignments
      .filter((a) => a.clusterId === clusterNum)
      .map((a) => a.imageId)

    const { error } = await supabase
      .from('images')
      .update({ cluster_id: clusterId, status: 'clustered' })
      .in('id', imageIds)

    if (error) throw new Error(`Failed to assign images to cluster: ${error.message}`)
  }

  // Update job cluster count
  await supabase
    .from('jobs')
    .update({ cluster_count: clusterNums.length })
    .eq('id', jobId)

  return clusterIdMap
}
