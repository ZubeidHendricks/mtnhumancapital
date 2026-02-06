import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, AlertTriangle, CheckCircle, Truck, Scale, FileText, User, Package, Calendar, MapPin } from "lucide-react";

export default function WeighbridgeSlipDetails() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const slipId = params.id;

  const { data: slip, isLoading } = useQuery({
    queryKey: [`/api/weighbridge/slips/${slipId}`],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!slip) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Slip Not Found</h2>
              <p className="text-muted-foreground mb-4">The weighbridge slip you're looking for doesn't exist.</p>
              <Button onClick={() => setLocation("/weighbridge")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const extractedData = slip.extractedData || {};
  const hasExtendedData = extractedData.transporter || extractedData.orderNumber || extractedData.driverName;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setLocation("/weighbridge")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Weighbridge Slip Details</h1>
              <p className="text-muted-foreground">Ticket #{slip.ticketNumber}</p>
            </div>
          </div>
          <Badge variant={slip.status === "verified" ? "default" : "secondary"} className="px-4 py-2 text-sm">
            {slip.status}
          </Badge>
        </div>

        {/* Image Preview */}
        {slip.imageUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={slip.imageUrl}
                alt="Weighbridge slip"
                className="w-full max-h-[600px] object-contain rounded border"
              />
            </CardContent>
          </Card>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Weight Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Gross Weight</div>
                <div className="text-2xl font-bold text-blue-600">
                  {slip.grossWeight ? `${slip.grossWeight.toLocaleString()} kg` : "N/A"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Tare Weight</div>
                <div className="text-2xl font-bold text-green-600">
                  {slip.tareWeight ? `${slip.tareWeight.toLocaleString()} kg` : "N/A"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Net Weight</div>
                <div className="text-2xl font-bold text-blue-600">
                  {slip.netWeight ? `${slip.netWeight.toLocaleString()} kg` : "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle & Product Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Vehicle Registration</div>
                <div className="text-lg font-semibold">{slip.vehicleRegistration || "N/A"}</div>
              </div>

              {extractedData.trailers && extractedData.trailers.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Trailers</div>
                  <div className="space-y-2">
                    {extractedData.trailers.map((trailer: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm font-medium">{trailer.type}</span>
                        <span className="font-mono">{trailer.plateNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Product</div>
                <div className="text-lg font-semibold">{slip.product || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Customer</div>
                <div className="text-lg font-semibold">{slip.customer || extractedData.customer || "N/A"}</div>
              </div>
              {extractedData.orderQuantity && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Order Quantity</div>
                  <div className="text-lg font-semibold">{extractedData.orderQuantity} kg</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Extended Information (for detailed certificates) */}
        {hasExtendedData && (
          <>
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {extractedData.transporter && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Transporter</div>
                      <div className="font-semibold">{extractedData.transporter}</div>
                    </div>
                  )}
                  {extractedData.orderNumber && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Order Number</div>
                      <div className="font-mono font-semibold">{extractedData.orderNumber}</div>
                    </div>
                  )}
                  {extractedData.orderType && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Order Type</div>
                      <div className="font-semibold">{extractedData.orderType}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Driver Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Driver Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {extractedData.driverName && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Full Name</div>
                      <div className="font-semibold">{extractedData.driverName}</div>
                    </div>
                  )}
                  {extractedData.driverIdNumber && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">ID Number</div>
                      <div className="font-mono font-semibold">{extractedData.driverIdNumber}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Weighbridge Breakdown */}
            {extractedData.weighbridgeBreakdown && extractedData.weighbridgeBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Detailed Weighbridge Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Plate</th>
                          <th className="text-right py-3 px-4">First Weight (kg)</th>
                          <th className="text-right py-3 px-4">Final Weight (kg)</th>
                          <th className="text-right py-3 px-4">Net Weight (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.weighbridgeBreakdown.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b hover:bg-muted">
                            <td className="py-3 px-4 font-medium">{item.plateNumber}</td>
                            <td className="py-3 px-4 text-right">{item.firstWeight?.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right">{item.finalWeight?.toLocaleString()}</td>
                            <td className={`py-3 px-4 text-right font-semibold ${item.netWeight < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {item.netWeight?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {extractedData.sealNumbers && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Seal Numbers</div>
                      <div className="font-semibold">
                        {Array.isArray(extractedData.sealNumbers)
                          ? extractedData.sealNumbers.join(", ")
                          : extractedData.sealNumbers || "N/A"}
                      </div>
                    </div>
                  )}
                  {extractedData.deliveryNumber && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Delivery Number</div>
                      <div className="font-mono font-semibold">{extractedData.deliveryNumber}</div>
                    </div>
                  )}
                  {extractedData.sapOrderNumber && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">SAP Order Number</div>
                      <div className="font-mono font-semibold">{extractedData.sapOrderNumber}</div>
                    </div>
                  )}
                  {extractedData.supplierStockPile && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Supplier Stock Pile</div>
                      <div className="font-semibold">{extractedData.supplierStockPile}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Timing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timing Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {extractedData.firstWeighTime && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">First Weigh Time</div>
                  <div className="font-semibold">
                    {new Date(extractedData.firstWeighTime).toLocaleString()}
                  </div>
                </div>
              )}
              {extractedData.finalWeighTime && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Final Weigh Time</div>
                  <div className="font-semibold">
                    {new Date(extractedData.finalWeighTime).toLocaleString()}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Document Created</div>
                <div className="font-semibold">
                  {new Date(slip.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Operator */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {slip.weighbridgeLocation || extractedData.weighbridgeLocation || "N/A"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Operator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {slip.operator || extractedData.operator || "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {(slip.notes || extractedData.additionalNotes) && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{slip.notes || extractedData.additionalNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Raw Data (for debugging) */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Raw Extracted Data (Debug)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
              {JSON.stringify(extractedData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
