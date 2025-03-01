import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { type User } from "@shared/schema";
import { UserProfile } from "@/components/backoffice/UserProfile";

export default function UsersPage() {
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  if (isLoading) {
    return (
      <BackofficeLayout>
        <div>Loading users...</div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <h1 className="text-4xl font-bold">User Management</h1>

        <div className="space-y-6">
          {users?.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center justify-between">
                  <span>{user.email}</span>
                  <span className="text-base font-normal text-muted-foreground">
                    Customer since: {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="profile">
                    <AccordionTrigger className="text-xl">
                      View Profile & Bookings
                    </AccordionTrigger>
                    <AccordionContent>
                      <UserProfile userId={user.id} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </BackofficeLayout>
  );
}
