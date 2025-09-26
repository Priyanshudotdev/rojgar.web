"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

export const JobCard = ({
  job,
  onEdit,
  onDelete,
  onClose,
}: {
  job: any;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) => {
  return (
    <Card className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg border">
      <CardHeader className="flex flex-row items-center justify-between p-6 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={job.companyLogo} alt={job.companyName} />
            <AvatarFallback>{job.companyName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              {job.title}
            </CardTitle>
            <p className="text-sm text-gray-500">{job.companyName}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Job Details
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Location:</strong> {job.location}
              </p>
              <p>
                <strong>Type:</strong> {job.type}
              </p>
              <p>
                <strong>Salary:</strong> {job.salary}
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Description
            </h3>
            <p className="text-sm text-gray-600">{job.description}</p>
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill: string) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
