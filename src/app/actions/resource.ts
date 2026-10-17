'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ResourceType } from '@prisma/client';
import { requireTutor } from '../../lib/auth';
import { createResourceSchema, parseInput } from '../../lib/validation';

export type CreateResourceInput = {
  courseId: string;
  topicId?: string;
  title: string;
  authorOrPublisher?: string;
  resourceType: ResourceType;
  url?: string;
  locationDetails?: string;
};

export async function createResourceAction(input: CreateResourceInput) {
  const data = parseInput(createResourceSchema, input);
  await requireTutor();

  await prisma.resource.create({
    data: {
      courseId: data.courseId,
      topicId: data.topicId || null,
      title: data.title.trim(),
      authorOrPublisher: data.authorOrPublisher?.trim() || null,
      resourceType: data.resourceType,
      url: data.url?.trim() || null,
      locationDetails: data.locationDetails?.trim() || null,
    },
  });

  revalidatePath('/library');
  redirect('/library');
}