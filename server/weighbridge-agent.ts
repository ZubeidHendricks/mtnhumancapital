import Groq from "groq-sdk";
import { storage } from "./storage";
import type { InsertWeighbridgeSlip } from "@shared/schema";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface WeighbridgeData {
  // Basic fields
  vehicleRegistration?: string;
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  dateTime?: string;
  operator?: string;
  product?: string;
  customer?: string;
  ticketNumber?: string;
  weighbridgeLocation?: string;
  additionalNotes?: string;

  // Extended fields for detailed certificates
  transporter?: string;
  orderNumber?: string;
  orderType?: string;
  driverName?: string;
  driverIdNumber?: string;
  trailers?: Array<{ plateNumber: string; type: string }>;
  weighbridgeBreakdown?: Array<{ plateNumber: string; firstWeight: number; finalWeight: number; netWeight: number }>;
  sealNumbers?: string;
  deliveryNumber?: string;
  sapOrderNumber?: string;
  supplierStockPile?: string;
  tankNumber?: string;
  orderQuantity?: number;
  firstWeighTime?: string;
  finalWeighTime?: string;
}

export class WeighbridgeAgent {
  async analyzeWeighbridgeImage(imageBase64: string, fileName: string): Promise<WeighbridgeData> {
    console.log(`[WeighbridgeAgent] Analyzing ${fileName} with Llama Vision (Groq)`);

    // Use Groq's free Llama Vision API
    if (process.env.GROQ_API_KEY) {
      return this.analyzeWithGroqVision(imageBase64, fileName);
    }

    // Fallback: Return template data for manual entry
    console.warn('[WeighbridgeAgent] No vision API available - returning template');
    return {
      vehicleRegistration: null,
      grossWeight: null,
      tareWeight: null,
      netWeight: null,
      dateTime: new Date().toISOString(),
      operator: null,
      product: null,
      customer: null,
      ticketNumber: `WB-${Date.now()}`,
      weighbridgeLocation: null,
      additionalNotes: "Manual entry required - upload image for reference"
    };
  }

  async analyzeWithGroqVision(imageBase64: string, fileName: string): Promise<WeighbridgeData> {
    const prompt = `Extract ALL data from this weighbridge document. Return ONLY a JSON object with all available fields.

JSON format (use null for missing fields):
{
  "vehicleRegistration": "LG24HFGP",
  "grossWeight": 57240,
  "tareWeight": 20020,
  "netWeight": 37220,
  "dateTime": "2026-01-13T15:41:47Z",
  "operator": "John Smith",
  "product": "COAL",
  "customer": "SASOL",
  "ticketNumber": "2935988",
  "weighbridgeLocation": "Matla Pad",
  "transporter": "ARB",
  "orderNumber": "11322",
  "orderType": "Chemical Stock Transfer Deliveries",
  "driverName": "SIKHOSANAM",
  "driverIdNumber": "8904205838084",
  "trailers": [{"plateNumber": "LG23YHGP", "type": "Trailer 1"}, {"plateNumber": "LG23WXGP", "type": "Trailer 2"}],
  "weighbridgeBreakdown": [{"plateNumber": "1", "firstWeight": 7180, "finalWeight": 5840, "netWeight": -1340}],
  "sealNumbers": "",
  "deliveryNumber": "",
  "sapOrderNumber": "",
  "supplierStockPile": "",
  "tankNumber": "",
  "orderQuantity": null,
  "firstWeighTime": "2026-01-13T15:08:29Z",
  "finalWeighTime": "2026-01-13T15:41:47Z",
  "additionalNotes": ""
}

Extract ALL visible fields including:
- Order information (transporter, order number, order type)
- Driver information (full name, ID number)
- All vehicle registrations (horse and trailers)
- Individual weighbridge breakdowns if multiple plates
- Customer details (seal numbers, delivery number, SAP order, supplier stock pile)
- Product details (tank number, order qty)
- First and final weigh times
- Any other visible information

Rules:
- Weights in kg (convert tons to kg)
- Dates/times in ISO 8601 format
- Return ONLY the JSON object`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'system',
              content: 'You are a data extraction assistant. Always respond with valid JSON only, no explanations or markdown.'
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[WeighbridgeAgent] Groq Vision API failed: ${response.status} - ${errorText}`);
        console.warn('[WeighbridgeAgent] Falling back to manual entry mode');

        return {
          vehicleRegistration: null,
          grossWeight: null,
          tareWeight: null,
          netWeight: null,
          dateTime: new Date().toISOString(),
          operator: null,
          product: null,
          customer: null,
          ticketNumber: `WB-${Date.now()}`,
          weighbridgeLocation: null,
          additionalNotes: "AI extraction unavailable - manual entry required"
        };
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content || "{}";

      console.log(`[WeighbridgeAgent] Raw response from Groq:`, content);

      // Clean up the response
      let jsonStr = content.trim();

      // Remove markdown code blocks
      if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      }

      // Remove any leading text before the JSON object
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }

      const data = JSON.parse(jsonStr);

      console.log(`[WeighbridgeAgent] Extracted data from ${fileName}:`, data);
      return data;
    } catch (error) {
      console.error("[WeighbridgeAgent] Groq Vision analysis failed:", error);

      return {
        vehicleRegistration: null,
        grossWeight: null,
        tareWeight: null,
        netWeight: null,
        dateTime: new Date().toISOString(),
        operator: null,
        product: null,
        customer: null,
        ticketNumber: `WB-${Date.now()}`,
        weighbridgeLocation: null,
        additionalNotes: "AI extraction failed - manual entry required"
      };
    }
  }

  async processAndSave(
    tenantId: string,
    imageBase64: string,
    fileName: string,
    imageUrl: string
  ): Promise<any> {
    try {
      console.log(`[WeighbridgeAgent] Processing weighbridge slip: ${fileName}`);
      
      const extractedData = await this.analyzeWeighbridgeImage(imageBase64, fileName);
      
      let netWeight = extractedData.netWeight;
      if (!netWeight && extractedData.grossWeight && extractedData.tareWeight) {
        netWeight = extractedData.grossWeight - extractedData.tareWeight;
      }
      
      const slipData: InsertWeighbridgeSlip = {
        tenantId,
        ticketNumber: extractedData.ticketNumber || `WB-${Date.now()}`,
        vehicleRegistration: extractedData.vehicleRegistration || null,
        grossWeight: extractedData.grossWeight || null,
        tareWeight: extractedData.tareWeight || null,
        netWeight: netWeight || null,
        weighDateTime: extractedData.dateTime ? new Date(extractedData.dateTime) : new Date(),
        operator: extractedData.operator || null,
        product: extractedData.product || null,
        customer: extractedData.customer || null,
        weighbridgeLocation: extractedData.weighbridgeLocation || null,
        imageUrl: imageUrl,
        extractedData: extractedData,
        status: "processed",
      };
      
      const savedSlip = await storage.createWeighbridgeSlip(slipData);
      
      console.log(`[WeighbridgeAgent] Successfully saved slip with ID: ${savedSlip.id}`);
      
      return {
        success: true,
        slip: savedSlip,
        extractedData: extractedData,
        message: `Successfully processed weighbridge slip ${savedSlip.ticketNumber}`
      };
    } catch (error: any) {
      console.error("[WeighbridgeAgent] Error processing slip:", error);
      throw error;
    }
  }

  async batchProcess(
    tenantId: string,
    files: Array<{ imageBase64: string; fileName: string; imageUrl: string }>
  ): Promise<any[]> {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.processAndSave(
          tenantId,
          file.imageBase64,
          file.fileName,
          file.imageUrl
        );
        results.push(result);
      } catch (error: any) {
        results.push({
          success: false,
          fileName: file.fileName,
          error: error.message
        });
      }
    }
    
    return results;
  }

  validateWeighbridgeData(data: WeighbridgeData): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    if (data.grossWeight && data.tareWeight && data.grossWeight < data.tareWeight) {
      warnings.push("Gross weight is less than tare weight - possible data error");
    }
    
    if (data.grossWeight && data.tareWeight && data.netWeight) {
      const calculatedNet = data.grossWeight - data.tareWeight;
      const difference = Math.abs(calculatedNet - data.netWeight);
      if (difference > 100) {
        warnings.push(`Net weight mismatch: Expected ${calculatedNet}kg, got ${data.netWeight}kg`);
      }
    }
    
    if (data.grossWeight && data.grossWeight > 80000) {
      warnings.push("Gross weight exceeds typical truck capacity (80,000kg)");
    }
    
    if (data.netWeight && data.netWeight < 0) {
      warnings.push("Negative net weight detected");
    }
    
    return {
      valid: warnings.length === 0,
      warnings
    };
  }
}

export const weighbridgeAgent = new WeighbridgeAgent();
