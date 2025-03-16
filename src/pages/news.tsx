import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Define a TypeScript interface for hackathons
interface Hackathon {
  name: string;
  description: string;
  date: string;
  url: string;
}

const fetchHackathons = async (): Promise<Hackathon[]> => {
  try {
    const devfolioResponse = await axios.get("https://devfolio.co/api/hackathons");
    const ustopResponse = await axios.get("https://api.ustop.com/hackathons");

    return [
      ...(devfolioResponse.data.hackathons || []),
      ...(ustopResponse.data.hackathons || []),
    ];
  } catch (error) {
    console.error("Error fetching hackathons:", error);
    return [];
  }
};

const News: React.FC = () => {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchHackathons().then((data) => {
      setHackathons(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Latest Hackathon Updates</h1>
      {loading ? (
        <Skeleton className="h-40 w-full mb-4" />
      ) : (
        hackathons.map((hackathon, index) => (
          <Card key={index} className="mb-4">
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold">{hackathon.name}</h2>
              <p className="text-gray-600">{hackathon.description}</p>
              <p className="text-sm text-gray-500">{hackathon.date}</p>
              <Button
                className="mt-2"
                onClick={() => window.open(hackathon.url, "_blank")}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default News;