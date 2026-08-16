import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateFlowDto } from './dto/create-flow.dto';
import { DuplicateFlowDto } from './dto/duplicate-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { Flow } from './entities/flow.entity';
import { FlowsService } from './flows.service';

@ApiTags('flows')
@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Get()
  @ApiOperation({ summary: 'List all flows' })
  @ApiOkResponse({ type: Flow, isArray: true })
  findAll(): Promise<Flow[]> {
    return this.flowsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flow by id' })
  @ApiOkResponse({ type: Flow })
  @ApiNotFoundResponse({ description: 'Flow not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Flow> {
    return this.flowsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a flow' })
  @ApiCreatedResponse({ type: Flow })
  create(@Body() dto: CreateFlowDto): Promise<Flow> {
    return this.flowsService.create(dto);
  }

  @Post(':id/duplicate')
  @ApiOperation({
    summary: 'Duplicate a flow under a new unique name',
    description:
      'Copies consumer, services, and producer config from the source flow. Requires a new name to avoid 409 conflicts.',
  })
  @ApiCreatedResponse({ type: Flow })
  @ApiNotFoundResponse({ description: 'Source flow not found' })
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateFlowDto,
  ): Promise<Flow> {
    return this.flowsService.duplicate(id, dto.name);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a flow' })
  @ApiOkResponse({ type: Flow })
  @ApiNotFoundResponse({ description: 'Flow not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFlowDto,
  ): Promise<Flow> {
    return this.flowsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flow' })
  @ApiOkResponse({
    description: 'Flow deleted',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Flow not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{
    message: string;
    id: string;
    name: string;
  }> {
    return this.flowsService.remove(id);
  }
}
